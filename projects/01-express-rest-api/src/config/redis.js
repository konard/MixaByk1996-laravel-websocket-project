const { createClient } = require('redis');
const logger = require('../utils/logger');

let client = null;

const connectRedis = async () => {
  client = createClient({ url: process.env.REDIS_URL });

  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  client.on('connect', () => logger.info('Redis connected'));
  client.on('disconnect', () => logger.warn('Redis disconnected'));

  await client.connect();
  return client;
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
};

const disconnectRedis = async () => {
  if (client) {
    await client.quit();
    client = null;
  }
};

module.exports = { connectRedis, getRedisClient, disconnectRedis };
