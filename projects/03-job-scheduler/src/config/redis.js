const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  client.on('connect', () => logger.info('Redis connected'));
  await client.connect();
  return client;
};

const getRedisClient = () => {
  if (!client) throw new Error('Redis not initialized');
  return client;
};

const disconnectRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
