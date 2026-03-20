const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Get a cached value by key
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const get = async (key) => {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    if (data) {
      logger.debug(`Cache HIT: ${key}`);
      return JSON.parse(data);
    }
    logger.debug(`Cache MISS: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Cache get error for key "${key}": ${error.message}`);
    return null;
  }
};

/**
 * Set a value in cache with optional TTL
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - seconds
 */
const set = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    const client = getRedisClient();
    await client.setEx(key, ttl, JSON.stringify(value));
    logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
  } catch (error) {
    logger.error(`Cache set error for key "${key}": ${error.message}`);
  }
};

/**
 * Delete a cached value by key
 * @param {string} key
 */
const del = async (key) => {
  try {
    const client = getRedisClient();
    await client.del(key);
    logger.debug(`Cache DEL: ${key}`);
  } catch (error) {
    logger.error(`Cache delete error for key "${key}": ${error.message}`);
  }
};

/**
 * Delete all keys matching a pattern
 * @param {string} pattern
 */
const delPattern = async (pattern) => {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      logger.debug(`Cache DEL pattern "${pattern}": ${keys.length} keys removed`);
    }
  } catch (error) {
    logger.error(`Cache delPattern error for pattern "${pattern}": ${error.message}`);
  }
};

/**
 * Wrap a function with caching
 * @param {string} key
 * @param {Function} fn - async function to call on cache miss
 * @param {number} ttl
 */
const wrap = async (key, fn, ttl = DEFAULT_TTL) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  const result = await fn();
  await set(key, result, ttl);
  return result;
};

module.exports = { get, set, del, delPattern, wrap };
