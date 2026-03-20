// Mock node-cron before requiring job.service
jest.mock('node-cron', () => ({
  validate: jest.fn(),
  schedule: jest.fn(),
}));

jest.mock('../../models/Job', () => ({
  Job: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  JOB_STATUSES: ['pending', 'queued', 'running', 'completed', 'failed', 'retrying'],
  JOB_TYPES: ['http_request', 'email', 'data_cleanup'],
}));

jest.mock('../../services/queue.service', () => ({
  enqueue: jest.fn(),
  isQueued: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const cron = require('node-cron');
const { Job } = require('../../models/Job');
const queue = require('../../services/queue.service');
const jobService = require('../../services/job.service');

describe('JobService', () => {
  const mockJob = {
    _id: { toString: () => 'job-id-1' },
    name: 'Test Job',
    cronExpression: '* * * * *',
    type: 'http_request',
    isActive: true,
    payload: { url: 'http://example.com' },
    maxRetries: 3,
    retryCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cron.validate.mockReturnValue(true);
    cron.schedule.mockReturnValue({ stop: jest.fn() });
  });

  describe('createJob()', () => {
    it('creates a job when CRON expression is valid', async () => {
      cron.validate.mockReturnValue(true);
      Job.create.mockResolvedValue(mockJob);

      const result = await jobService.createJob({
        name: 'Test Job',
        type: 'http_request',
        cronExpression: '* * * * *',
      });

      expect(cron.validate).toHaveBeenCalledWith('* * * * *');
      expect(Job.create).toHaveBeenCalled();
      expect(result).toBe(mockJob);
    });

    it('throws on invalid CRON expression', async () => {
      cron.validate.mockReturnValue(false);

      await expect(
        jobService.createJob({ name: 'Bad Job', type: 'http_request', cronExpression: 'bad' })
      ).rejects.toThrow('Invalid CRON expression');

      expect(Job.create).not.toHaveBeenCalled();
    });
  });

  describe('triggerJob()', () => {
    it('enqueues job and updates status', async () => {
      Job.findById.mockResolvedValue(mockJob);
      Job.findByIdAndUpdate.mockResolvedValue(mockJob);
      queue.isQueued.mockResolvedValue(false);

      await jobService.triggerJob('job-id-1');

      expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
        'job-id-1',
        expect.objectContaining({ status: 'queued' })
      );
      expect(queue.enqueue).toHaveBeenCalledWith('job-id-1');
    });

    it('skips enqueueing if job is already queued', async () => {
      Job.findById.mockResolvedValue(mockJob);
      queue.isQueued.mockResolvedValue(true);

      await jobService.triggerJob('job-id-1');

      expect(queue.enqueue).not.toHaveBeenCalled();
      expect(Job.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('skips inactive jobs', async () => {
      Job.findById.mockResolvedValue({ ...mockJob, isActive: false });

      await jobService.triggerJob('job-id-1');

      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('handles unknown job gracefully', async () => {
      Job.findById.mockResolvedValue(null);

      await expect(jobService.triggerJob('nonexistent')).resolves.toBeUndefined();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('scheduleAll()', () => {
    it('schedules all active jobs', async () => {
      const jobs = [
        { ...mockJob, _id: { toString: () => 'j1' }, cronExpression: '0 * * * *' },
        { ...mockJob, _id: { toString: () => 'j2' }, cronExpression: '0 0 * * *' },
      ];
      Job.find.mockResolvedValue(jobs);

      const count = await jobService.scheduleAll();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
      expect(count).toBe(2);
    });
  });

  describe('deleteJob()', () => {
    it('deletes job from DB', async () => {
      Job.findByIdAndDelete.mockResolvedValue(mockJob);

      const result = await jobService.deleteJob('job-id-1');

      expect(Job.findByIdAndDelete).toHaveBeenCalledWith('job-id-1');
      expect(result).toBe(mockJob);
    });
  });
});
