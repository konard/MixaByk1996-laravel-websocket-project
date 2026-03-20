const queue = require('../../services/queue.service');
const { getRedisClient } = require('../../config/redis');

jest.mock('../../config/redis', () => ({ getRedisClient: jest.fn() }));
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

describe('QueueService', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      zAdd: jest.fn().mockResolvedValue(1),
      zPopMin: jest.fn().mockResolvedValue([]),
      lPush: jest.fn().mockResolvedValue(1),
      zCard: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
      zScore: jest.fn().mockResolvedValue(null),
    };
    getRedisClient.mockReturnValue(mockClient);
    jest.clearAllMocks();
    getRedisClient.mockReturnValue(mockClient);
  });

  describe('enqueue()', () => {
    it('adds job to sorted set with timestamp score', async () => {
      const before = Date.now();
      await queue.enqueue('job123');
      const after = Date.now();

      expect(mockClient.zAdd).toHaveBeenCalledWith(
        expect.any(String),
        [expect.objectContaining({ value: 'job123', score: expect.any(Number) })]
      );
      const call = mockClient.zAdd.mock.calls[0];
      const score = call[1][0].score;
      expect(score).toBeGreaterThanOrEqual(before);
      expect(score).toBeLessThanOrEqual(after);
    });

    it('adds priority offset to score', async () => {
      const before = Date.now();
      await queue.enqueue('job456', 5000);
      const after = Date.now();

      const call = mockClient.zAdd.mock.calls[0];
      const score = call[1][0].score;
      expect(score).toBeGreaterThanOrEqual(before + 5000);
      expect(score).toBeLessThanOrEqual(after + 5000);
    });
  });

  describe('dequeue()', () => {
    it('returns empty array when queue is empty', async () => {
      mockClient.zPopMin.mockResolvedValue([]);
      const result = await queue.dequeue(5);
      expect(result).toEqual([]);
    });

    it('returns array of jobIds', async () => {
      mockClient.zPopMin.mockResolvedValue([
        { value: 'job1', score: 100 },
        { value: 'job2', score: 200 },
      ]);
      const result = await queue.dequeue(2);
      expect(result).toEqual(['job1', 'job2']);
    });
  });

  describe('moveToDeadLetter()', () => {
    it('pushes serialized entry to dead-letter list', async () => {
      await queue.moveToDeadLetter('jobFail', 'timeout error');

      expect(mockClient.lPush).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"jobId":"jobFail"')
      );
    });
  });

  describe('getQueueLength()', () => {
    it('returns sorted set cardinality', async () => {
      mockClient.zCard.mockResolvedValue(42);
      const len = await queue.getQueueLength();
      expect(len).toBe(42);
    });
  });

  describe('isQueued()', () => {
    it('returns true when job has a score in sorted set', async () => {
      mockClient.zScore.mockResolvedValue(12345);
      expect(await queue.isQueued('jobX')).toBe(true);
    });

    it('returns false when job is not in sorted set', async () => {
      mockClient.zScore.mockResolvedValue(null);
      expect(await queue.isQueued('jobX')).toBe(false);
    });
  });

  describe('getDeadLetterJobs()', () => {
    it('returns parsed dead-letter entries', async () => {
      const entry = JSON.stringify({ jobId: 'j1', reason: 'error', timestamp: '2024-01-01' });
      mockClient.lRange.mockResolvedValue([entry]);
      const result = await queue.getDeadLetterJobs();
      expect(result).toEqual([{ jobId: 'j1', reason: 'error', timestamp: '2024-01-01' }]);
    });
  });
});
