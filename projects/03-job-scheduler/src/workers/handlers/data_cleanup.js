const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Data cleanup job handler.
 * Removes old documents from a specified collection older than `olderThanDays`.
 * Payload: { collection, olderThanDays, filter }
 */
const dataCleanupHandler = async (payload) => {
  const { collection, olderThanDays = 30, filter = {} } = payload;

  if (!collection) {
    throw new Error('Data cleanup job requires "collection" in payload');
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const query = { ...filter, createdAt: { $lt: cutoffDate } };

  const db = mongoose.connection.db;
  const col = db.collection(collection);

  const result = await col.deleteMany(query);

  logger.info(
    `Data cleanup: deleted ${result.deletedCount} documents from "${collection}" older than ${olderThanDays} days`
  );

  return {
    collection,
    deletedCount: result.deletedCount,
    cutoffDate: cutoffDate.toISOString(),
  };
};

module.exports = dataCleanupHandler;
