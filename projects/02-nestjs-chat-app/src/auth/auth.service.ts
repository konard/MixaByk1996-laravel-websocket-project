import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ token: string; user: UserDocument }> {
    const user = await this.usersService.create(dto);
    const token = this.signToken(user._id.toString(), user.email);
    return { token, user };
  }

  async login(dto: LoginDto): Promise<{ token: string; user: UserDocument }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await user.comparePassword(dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = this.signToken(user._id.toString(), user.email);
    user.password = undefined;
    return { token, user };
  }

  private signToken(sub: string, email: string): string {
    return this.jwtService.sign({ sub, email });
  }
}
