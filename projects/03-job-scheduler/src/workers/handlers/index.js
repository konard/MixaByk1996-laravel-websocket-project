/**
 * Job type handlers registry.
 * Each handler receives the job's payload and returns a result (or throws on failure).
 */
const httpRequestHandler = require('./http_request');
const emailHandler = require('./email');
const dataCleanupHandler = require('./data_cleanup');

const handlers = {
  http_request: httpRequestHandler,
  email: emailHandler,
  data_cleanup: dataCleanupHandler,
  report_generation: async (payload) => {
    // Placeholder — extend with actual report logic
    return { generated: true, reportId: `report_${Date.now()}`, payload };
  },
  custom_script: async (payload) => {
    // Placeholder — in production, safely execute sandboxed scripts
    return { executed: true, payload };
  },
};

module.exports = handlers;
