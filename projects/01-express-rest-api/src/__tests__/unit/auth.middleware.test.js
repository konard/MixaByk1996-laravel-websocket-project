const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../middleware/auth');
const User = require('../../models/User');

jest.mock('jsonwebtoken');
jest.mock('../../models/User');

process.env.JWT_SECRET = 'test-secret';

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    it('returns 401 when no Authorization header', async () => {
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No token provided' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic abc123';
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when token is expired', async () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      });
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Token expired' })
      );
    });

    it('returns 401 when user not found', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ id: 'user-id' });
      User.findById.mockResolvedValue(null);
      await authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('sets req.user and calls next on valid token', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const user = { _id: 'user-id', isActive: true, role: 'user' };
      jwt.verify.mockReturnValue({ id: 'user-id' });
      User.findById.mockResolvedValue(user);
      await authenticate(req, res, next);
      expect(req.user).toEqual(user);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorize()', () => {
    it('calls next when user has required role', () => {
      req.user = { role: 'admin' };
      authorize('admin')(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user lacks required role', () => {
      req.user = { role: 'user' };
      authorize('admin')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows multiple roles', () => {
      req.user = { role: 'user' };
      authorize('admin', 'user')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
