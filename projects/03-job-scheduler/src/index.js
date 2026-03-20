require('dotenv').config();
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { scheduleAll } = require('./services/job.service');
const worker = require('./workers/job.worker');
const logger = require('./utils/logger');

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    // Load and schedule all active jobs from DB
    const scheduled = await scheduleAll();
    logger.info(`Scheduler started: ${scheduled} jobs scheduled`);

    // Start job worker
    const workerInstance = worker.start(1000);

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      workerInstance.stop();
      const { disconnectDB } = require('./config/database');
      const { disconnectRedis } = require('./config/redis');
      await disconnectDB();
      await disconnectRedis();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    logger.info('Job scheduler is running. Press Ctrl+C to stop.');
  } catch (error) {
    logger.error(`Failed to start: ${error.message}`);
    process.exit(1);
  }
};

start();
