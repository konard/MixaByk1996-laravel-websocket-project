import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    _id: { toString: () => 'user-id-123' },
    name: 'Alice',
    email: 'alice@example.com',
    comparePassword: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('register()', () => {
    it('creates user and returns token', async () => {
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
      });

      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
      });
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user).toBe(mockUser);
    });

    it('propagates ConflictException from UsersService', async () => {
      usersService.create.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(
        service.register({ name: 'Alice', email: 'alice@example.com', password: 'secret123' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login()', () => {
    it('returns token on valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'alice@example.com',
        password: 'secret123',
      });

      expect(result.token).toBe('mock-jwt-token');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      mockUser.comparePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'secret123' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
