const axios = require('axios');
jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

describe('Job Handlers', () => {
  describe('http_request handler', () => {
    const httpHandler = require('../../workers/handlers/http_request');

    it('succeeds when response matches expected status', async () => {
      axios.mockResolvedValue({ status: 200, data: { ok: true } });

      const result = await httpHandler({
        url: 'https://example.com/api',
        method: 'GET',
        expectedStatus: 200,
      });

      expect(result.status).toBe(200);
      expect(result.url).toBe('https://example.com/api');
    });

    it('throws when status does not match expected', async () => {
      axios.mockResolvedValue({ status: 404, data: 'Not Found' });

      await expect(
        httpHandler({ url: 'https://example.com/missing', expectedStatus: 200 })
      ).rejects.toThrow('returned 404, expected 200');
    });

    it('throws when url is missing from payload', async () => {
      await expect(httpHandler({})).rejects.toThrow('"url"');
    });

    it('passes method, headers, and body to axios', async () => {
      axios.mockResolvedValue({ status: 201, data: {} });

      await httpHandler({
        url: 'https://example.com/api',
        method: 'POST',
        headers: { 'X-API-Key': 'key123' },
        body: { foo: 'bar' },
        expectedStatus: 201,
      });

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/api',
          headers: { 'X-API-Key': 'key123' },
          data: { foo: 'bar' },
        })
      );
    });
  });

  describe('data_cleanup handler', () => {
    const dataCleanupHandler = require('../../workers/handlers/data_cleanup');

    it('throws when collection is not specified', async () => {
      await expect(dataCleanupHandler({})).rejects.toThrow('"collection"');
    });

    it('deletes documents older than specified days', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 7 });
      const mockCollection = jest.fn().mockReturnValue({ deleteMany: mockDeleteMany });

      const mongoose = require('mongoose');
      mongoose.connection = { db: { collection: mockCollection } };

      const result = await dataCleanupHandler({ collection: 'logs', olderThanDays: 7 });

      expect(result.deletedCount).toBe(7);
      expect(result.collection).toBe('logs');
      expect(mockDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ createdAt: expect.objectContaining({ $lt: expect.any(Date) }) })
      );
    });
  });
});
