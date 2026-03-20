const cacheService = require('../../services/cache.service');
const { getRedisClient } = require('../../config/redis');

// Mock Redis client
jest.mock('../../config/redis', () => ({
  getRedisClient: jest.fn(),
}));

// Mock logger to suppress output
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('CacheService', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };
    getRedisClient.mockReturnValue(mockClient);
    jest.clearAllMocks();
  });

  describe('get()', () => {
    it('returns parsed JSON when key exists', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'Test' }));
      const result = await cacheService.get('test-key');
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null when key does not exist', async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await cacheService.get('missing-key');
      expect(result).toBeNull();
    });

    it('returns null on Redis error', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis unavailable'));
      const result = await cacheService.get('error-key');
      expect(result).toBeNull();
    });
  });

  describe('set()', () => {
    it('stores serialized JSON with TTL', async () => {
      mockClient.setEx.mockResolvedValue('OK');
      await cacheService.set('my-key', { value: 42 }, 60);
      expect(mockClient.setEx).toHaveBeenCalledWith('my-key', 60, JSON.stringify({ value: 42 }));
    });

    it('uses default TTL when not specified', async () => {
      mockClient.setEx.mockResolvedValue('OK');
      await cacheService.set('my-key', 'hello');
      expect(mockClient.setEx).toHaveBeenCalledWith('my-key', 3600, '"hello"');
    });

    it('does not throw on Redis error', async () => {
      mockClient.setEx.mockRejectedValue(new Error('Redis unavailable'));
      await expect(cacheService.set('key', 'value')).resolves.toBeUndefined();
    });
  });

  describe('del()', () => {
    it('deletes a key', async () => {
      mockClient.del.mockResolvedValue(1);
      await cacheService.del('delete-key');
      expect(mockClient.del).toHaveBeenCalledWith('delete-key');
    });
  });

  describe('delPattern()', () => {
    it('deletes all matching keys', async () => {
      mockClient.keys.mockResolvedValue(['key:1', 'key:2', 'key:3']);
      mockClient.del.mockResolvedValue(3);
      await cacheService.delPattern('key:*');
      expect(mockClient.del).toHaveBeenCalledWith(['key:1', 'key:2', 'key:3']);
    });

    it('does nothing when no keys match', async () => {
      mockClient.keys.mockResolvedValue([]);
      await cacheService.delPattern('empty:*');
      expect(mockClient.del).not.toHaveBeenCalled();
    });
  });

  describe('wrap()', () => {
    it('returns cached value without calling fn', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ cached: true }));
      const fn = jest.fn();
      const result = await cacheService.wrap('wrap-key', fn);
      expect(result).toEqual({ cached: true });
      expect(fn).not.toHaveBeenCalled();
    });

    it('calls fn and caches result on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);
      mockClient.setEx.mockResolvedValue('OK');
      const fn = jest.fn().mockResolvedValue({ fresh: true });
      const result = await cacheService.wrap('wrap-key', fn, 120);
      expect(result).toEqual({ fresh: true });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockClient.setEx).toHaveBeenCalledWith('wrap-key', 120, JSON.stringify({ fresh: true }));
    });
  });
});
