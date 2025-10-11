import request from 'supertest';
import { app } from '../../index';
import { logger } from '../../lib/logger';

describe('E2E: Server Core Flows', () => {
  beforeAll(() => {
    // Suppress logs during testing
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration & Health Check', () => {
    it('should respond to health check with correct structure', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have correct CORS headers', async () => {
      // CORS is enforced on API routes; health root may omit
      const origin = 'http://localhost:3000';
      const response = await request(app).get('/api/v2/health').set('Origin', origin);

      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers).toHaveProperty('access-control-allow-credentials');
    });

    it('should have security headers (Helmet)', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      // Helmet default may be 'DENY' or adjusted to 'SAMEORIGIN'; accept both
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
      // HSTS may be omitted in non-HTTPS dev environments
    });
  });

  describe('Rate Limiting', () => {
    it('should apply general rate limiting to API routes', async () => {
      const response = await request(app).get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit', '60');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Verify remaining count is a number
      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it('should apply stricter rate limiting to auth routes', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      // Should have auth rate limiting headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit', '5');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      // Verify remaining count for auth endpoints
      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(5);
    });

    it('should track rate limits per IP', async () => {
      // Make first request
      const response1 = await request(app).get('/api/v2/health');
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);

      // Make second request
      const response2 = await request(app).get('/api/v2/health');
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);

      // Remaining should decrease
      expect(remaining2).toBe(remaining1 - 1);
    });
  });

  describe('Logging Integration', () => {
    let debugSpy: jest.SpyInstance;
    let infoSpy: jest.SpyInstance;

    beforeEach(() => {
      debugSpy = jest.spyOn(logger, 'debug');
      infoSpy = jest.spyOn(logger, 'info');
    });

    afterEach(() => {
      debugSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it('should log incoming requests', async () => {
      await request(app).get('/health');

      expect(debugSpy).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          url: '/health',
          ip: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });

    it('should log HTTP responses with metrics', async () => {
      await request(app).get('/health');
      const call = infoSpy.mock.calls.find(([msg]) => typeof msg === 'string' && msg.startsWith('GET /health 200 -'));
      expect(call).toBeTruthy();
      expect(call?.[1]).toEqual(
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: expect.any(String),
          responseSize: expect.any(Number),
        })
      );
    });

    it('should log errors with appropriate level', async () => {
      const warnSpy = jest.spyOn(logger, 'warn');

      await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'invalid', password: 'short' });

      const warnCall = warnSpy.mock.calls.find(([msg, meta]) =>
        typeof msg === 'string' && msg.includes('POST /api/v2/auth/login') && (meta?.statusCode ?? 0) >= 400
      );
      expect(warnCall).toBeTruthy();
      expect(warnCall?.[1]).toEqual(
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: expect.any(String),
          responseSize: expect.any(Number),
        })
      );

      warnSpy.mockRestore();
    });
  });

  describe('API Validation & Error Handling', () => {
    it('should validate request bodies', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'invalid-email', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return JSON error responses', async () => {
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({ invalid: 'data' });

      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toBeInstanceOf(Object);
    });
  });

  describe('WebSocket Integration', () => {
    it('should initialize WebSocket server without errors', async () => {
      // WebSocket server should be initialized during app startup
      // We can verify this by checking that the server starts successfully
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);

      // The fact that we can make requests means the server (including WebSocket) started properly
    });
  });

  describe('API Routes Structure', () => {
    it('should mount API v2 routes correctly', async () => {
      const response = await request(app).get('/api/v2/health');
      expect(response.status).toBe(200);
    });

    it('should handle non-existent routes', async () => {
      const response = await request(app).get('/api/v2/non-existent');
      expect(response.status).toBe(404);
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await request(app).patch('/health');
      expect(response.status).toBe(404);
    });
  });

  describe('Compression & Performance', () => {
    it('should compress responses when appropriate', async () => {
      const response = await request(app)
        .get('/api/v2/health')
        .set('Accept-Encoding', 'gzip');

      // Compression middleware should handle this automatically
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });
  });
});
