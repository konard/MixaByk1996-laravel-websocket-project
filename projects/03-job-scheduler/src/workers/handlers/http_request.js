const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * HTTP request job handler.
 * Payload: { url, method, headers, body, expectedStatus }
 */
const httpRequestHandler = async (payload) => {
  const {
    url,
    method = 'GET',
    headers = {},
    body = null,
    expectedStatus = 200,
    timeoutMs = Number(process.env.HTTP_TIMEOUT_MS) || 10000,
  } = payload;

  if (!url) {
    throw new Error('HTTP request job requires a "url" in payload');
  }

  logger.debug(`HTTP handler: ${method} ${url}`);

  const response = await axios({
    method,
    url,
    headers,
    data: body,
    timeout: timeoutMs,
    validateStatus: () => true, // don't throw on non-2xx
  });

  if (response.status !== expectedStatus) {
    throw new Error(
      `HTTP request to ${url} returned ${response.status}, expected ${expectedStatus}`
    );
  }

  return {
    status: response.status,
    url,
    method,
    responseSize: JSON.stringify(response.data).length,
  };
};

module.exports = httpRequestHandler;
