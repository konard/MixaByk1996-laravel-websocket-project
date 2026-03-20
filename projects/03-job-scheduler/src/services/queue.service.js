const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = process.env.JOB_QUEUE_NAME || 'job-scheduler:queue';
const DEAD_LETTER_QUEUE = process.env.DEAD_LETTER_QUEUE || 'job-scheduler:dead';

/**
 * Enqueue a job for processing
 * @param {string} jobId - MongoDB ObjectId as string
 * @param {number} priority - Lower = higher priority (default 0)
 */
const enqueue = async (jobId, priority = 0) => {
  const client = getRedisClient();
  const score = Date.now() + priority;
  await client.zAdd(QUEUE_NAME, [{ score, value: jobId }]);
  logger.debug(`Job ${jobId} enqueued with priority score ${score}`);
};

/**
 * Dequeue up to N jobs from the queue (sorted by score, lowest first)
 * @param {number} count
 * @returns {Promise<string[]>} array of jobIds
 */
const dequeue = async (count = 1) => {
  const client = getRedisClient();
  // Use ZPOPMIN to atomically pop lowest-scored items
  const items = await client.zPopMin(QUEUE_NAME, count);
  const jobIds = items.map((item) => item.value);
  if (jobIds.length > 0) {
    logger.debug(`Dequeued ${jobIds.length} job(s): ${jobIds.join(', ')}`);
  }
  return jobIds;
};

/**
 * Move a job to the dead-letter queue
 * @param {string} jobId
 * @param {string} reason
 */
const moveToDeadLetter = async (jobId, reason) => {
  const client = getRedisClient();
  const payload = JSON.stringify({ jobId, reason, timestamp: new Date().toISOString() });
  await client.lPush(DEAD_LETTER_QUEUE, payload);
  logger.warn(`Job ${jobId} moved to dead-letter queue: ${reason}`);
};

/**
 * Get current queue length
 * @returns {Promise<number>}
 */
const getQueueLength = async () => {
  const client = getRedisClient();
  return client.zCard(QUEUE_NAME);
};

/**
 * Get dead-letter queue contents
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getDeadLetterJobs = async (limit = 100) => {
  const client = getRedisClient();
  const items = await client.lRange(DEAD_LETTER_QUEUE, 0, limit - 1);
  return items.map((item) => JSON.parse(item));
};

/**
 * Check if job is already in queue
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
const isQueued = async (jobId) => {
  const client = getRedisClient();
  const score = await client.zScore(QUEUE_NAME, jobId);
  return score !== null;
};

module.exports = { enqueue, dequeue, moveToDeadLetter, getQueueLength, getDeadLetterJobs, isQueued };
