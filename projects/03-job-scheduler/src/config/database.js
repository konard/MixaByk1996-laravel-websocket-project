const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  logger.info(`MongoDB connected: ${conn.connection.host}`);
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
