const cron = require('node-cron');
const { Job } = require('../models/Job');
const queue = require('./queue.service');
const logger = require('../utils/logger');

// Map of running cron tasks: jobId -> cron task
const activeTasks = new Map();

/**
 * Create a new scheduled job
 */
const createJob = async (data) => {
  if (!cron.validate(data.cronExpression)) {
    throw new Error(`Invalid CRON expression: "${data.cronExpression}"`);
  }
  const job = await Job.create(data);
  logger.info(`Job created: ${job.name} (${job._id})`);
  return job;
};

/**
 * Schedule all active jobs from DB (called on startup)
 */
const scheduleAll = async () => {
  const jobs = await Job.find({ isActive: true });
  let scheduled = 0;
  for (const job of jobs) {
    try {
      await scheduleJob(job);
      scheduled++;
    } catch (err) {
      logger.error(`Failed to schedule job ${job._id}: ${err.message}`);
    }
  }
  logger.info(`Scheduled ${scheduled}/${jobs.length} active jobs`);
  return scheduled;
};

/**
 * Schedule a single job
 */
const scheduleJob = async (job) => {
  if (!cron.validate(job.cronExpression)) {
    logger.error(`Cannot schedule job ${job._id}: invalid CRON expression "${job.cronExpression}"`);
    return;
  }

  // Stop existing task if present
  if (activeTasks.has(job._id.toString())) {
    activeTasks.get(job._id.toString()).stop();
  }

  const task = cron.schedule(job.cronExpression, async () => {
    logger.info(`CRON triggered job: ${job.name} (${job._id})`);
    await triggerJob(job._id.toString());
  });

  activeTasks.set(job._id.toString(), task);
  logger.debug(`Scheduled job: ${job.name} | CRON: ${job.cronExpression}`);
};

/**
 * Trigger a job (enqueue it for worker processing)
 */
const triggerJob = async (jobId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    logger.warn(`Trigger called for unknown job: ${jobId}`);
    return;
  }
  if (!job.isActive) {
    logger.debug(`Skipping inactive job: ${jobId}`);
    return;
  }

  // Avoid double-queuing
  const alreadyQueued = await queue.isQueued(jobId);
  if (alreadyQueued) {
    logger.debug(`Job ${jobId} already in queue, skipping`);
    return;
  }

  await Job.findByIdAndUpdate(jobId, { status: 'queued', lastRunAt: new Date() });
  await queue.enqueue(jobId);
  logger.info(`Job ${job.name} (${jobId}) queued for execution`);
};

/**
 * Stop and remove a scheduled job
 */
const stopJob = async (jobId) => {
  const task = activeTasks.get(jobId);
  if (task) {
    task.stop();
    activeTasks.delete(jobId);
  }
  await Job.findByIdAndUpdate(jobId, { isActive: false, status: 'pending' });
  logger.info(`Job ${jobId} stopped`);
};

/**
 * Get all jobs with optional filters
 */
const getJobs = async (filter = {}) => {
  return Job.find(filter).sort({ createdAt: -1 });
};

/**
 * Get job by ID
 */
const getJobById = async (id) => {
  return Job.findById(id);
};

/**
 * Update a job definition
 */
const updateJob = async (id, updates) => {
  if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
    throw new Error(`Invalid CRON expression: "${updates.cronExpression}"`);
  }
  const job = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (job && job.isActive && updates.cronExpression) {
    await scheduleJob(job);
  }
  return job;
};

/**
 * Delete a job
 */
const deleteJob = async (id) => {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
  }
  return Job.findByIdAndDelete(id);
};

/**
 * Get count of active scheduled tasks
 */
const getActiveTaskCount = () => activeTasks.size;

module.exports = {
  createJob,
  scheduleAll,
  scheduleJob,
  triggerJob,
  stopJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getActiveTaskCount,
};
