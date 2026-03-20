/**
 * Integration tests for /api/auth routes.
 * These tests mock MongoDB and Redis connections so they run without real infrastructure.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');

// Mock Redis config so app doesn't need a real Redis connection
jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
  })),
  connectRedis: jest.fn().mockResolvedValue(undefined),
  disconnectRedis: jest.fn().mockResolvedValue(undefined),
}));

// Mock Mongoose model methods
jest.mock('../../models/User');

process.env.JWT_SECRET = 'integration-test-secret';
process.env.NODE_ENV = 'test';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('returns 422 on missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('returns 422 on invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'not-an-email', password: 'secret123' });
      expect(res.status).toBe(422);
    });

    it('returns 409 when email already exists', async () => {
      User.findOne.mockResolvedValue({ email: 'alice@example.com' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });
      expect(res.status).toBe(409);
    });

    it('creates user and returns token on valid data', async () => {
      User.findOne.mockResolvedValue(null);
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user',
        toJSON: () => ({ name: 'Alice', email: 'alice@example.com' }),
      };
      User.create.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 422 on missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(422);
    });

    it('returns 401 on invalid credentials', async () => {
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'wrongpass' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/unknown', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
    });
  });
});
