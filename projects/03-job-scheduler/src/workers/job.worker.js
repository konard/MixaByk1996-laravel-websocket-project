/**
 * Job Worker — processes jobs from the Redis queue.
 * Reads job definitions from MongoDB, executes the appropriate handler,
 * and updates job status/run history.
 */
const { Job } = require('../models/Job');
const queue = require('../services/queue.service');
const logger = require('../utils/logger');
const handlers = require('./handlers');

const MAX_RETRIES = Number(process.env.JOB_MAX_RETRIES) || 3;
const RETRY_DELAY_MS = Number(process.env.JOB_RETRY_DELAY_MS) || 5000;
const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;

let isRunning = false;
let activeTasks = 0;

/**
 * Process a single job
 */
const processJob = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    logger.warn(`Worker: job ${jobId} not found in DB`);
    return;
  }

  const runRecord = { startedAt: new Date(), status: 'success', output: null, error: null };

  try {
    logger.info(`Worker: executing job "${job.name}" (${jobId}) type=${job.type}`);
    await Job.findByIdAndUpdate(jobId, { status: 'running' });

    const handler = handlers[job.type];
    if (!handler) {
      throw new Error(`No handler registered for job type: ${job.type}`);
    }

    const output = await handler(job.payload);
    runRecord.output = output;
    runRecord.completedAt = new Date();
    runRecord.duration = runRecord.completedAt - runRecord.startedAt;

    await Job.findByIdAndUpdate(jobId, {
      status: 'completed',
      retryCount: 0,
      $push: { runs: { $each: [runRecord], $slice: -50 } }, // keep last 50 runs
    });

    logger.info(`Worker: job "${job.name}" (${jobId}) completed in ${runRecord.duration}ms`);
  } catch (err) {
    runRecord.status = 'failure';
    runRecord.error = err.message;
    runRecord.completedAt = new Date();
    runRecord.duration = runRecord.completedAt - runRecord.startedAt;

    const newRetryCount = (job.retryCount || 0) + 1;

    if (newRetryCount <= Math.min(job.maxRetries, MAX_RETRIES)) {
      logger.warn(
        `Worker: job "${job.name}" (${jobId}) failed (attempt ${newRetryCount}/${job.maxRetries}). Retrying in ${RETRY_DELAY_MS}ms`
      );

      await Job.findByIdAndUpdate(jobId, {
        status: 'retrying',
        retryCount: newRetryCount,
        $push: { runs: { $each: [runRecord], $slice: -50 } },
      });

      setTimeout(async () => {
        await queue.enqueue(jobId);
      }, RETRY_DELAY_MS);
    } else {
      logger.error(
        `Worker: job "${job.name}" (${jobId}) permanently failed after ${newRetryCount} attempts`
      );

      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        retryCount: newRetryCount,
        $push: { runs: { $each: [runRecord], $slice: -50 } },
      });

      await queue.moveToDeadLetter(jobId, err.message);
    }
  }
};

/**
 * Poll the queue and process jobs up to concurrency limit
 */
const poll = async () => {
  if (!isRunning) return;

  const available = WORKER_CONCURRENCY - activeTasks;
  if (available <= 0) return;

  const jobIds = await queue.dequeue(available);

  for (const jobId of jobIds) {
    activeTasks++;
    processJob(jobId)
      .catch((err) => logger.error(`Worker: unhandled error for job ${jobId}: ${err.message}`))
      .finally(() => {
        activeTasks--;
      });
  }
};

/**
 * Start the worker polling loop
 * @param {number} intervalMs - polling interval in milliseconds
 */
const start = (intervalMs = 1000) => {
  if (isRunning) {
    logger.warn('Worker already running');
    return;
  }
  isRunning = true;
  logger.info(`Worker started (concurrency=${WORKER_CONCURRENCY}, interval=${intervalMs}ms)`);

  const interval = setInterval(async () => {
    try {
      await poll();
    } catch (err) {
      logger.error(`Worker poll error: ${err.message}`);
    }
  }, intervalMs);

  return {
    stop: () => {
      isRunning = false;
      clearInterval(interval);
      logger.info('Worker stopped');
    },
    getStats: () => ({ activeTasks, isRunning }),
  };
};

module.exports = { start, processJob, poll };
