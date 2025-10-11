import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Import our middleware
import { appConfig } from '../../config';
import { logger } from '../../lib/logger';
import { loggingMiddleware, errorLoggingMiddleware } from '../../middlewares/logging.middleware';
import { apiRateLimit, authRateLimit } from '../../middlewares/rateLimit.middleware';

describe('E2E: Middleware Integration Tests', () => {
  let testApp: express.Application;

  beforeAll(() => {
    // Create minimal test app with our middleware
    testApp = express();

    // Apply same middleware as main app
    testApp.use(loggingMiddleware);
    testApp.use(helmet());
    testApp.use(cors({
      origin: appConfig.cors.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    }));
    testApp.use(compression());
    testApp.use(express.json());
    testApp.use(express.urlencoded({ extended: true }));
    testApp.use(cookieParser());

    // Test routes
    testApp.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API routes with rate limiting
    const apiRouter = express.Router();
    apiRouter.use(apiRateLimit);
    apiRouter.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'API v2 health check' });
    });

    // Auth routes with stricter rate limiting
    const authRouter = express.Router();
    authRouter.post('/login', authRateLimit, (req, res) => {
      // Simple validation
      const { email, password } = req.body;
      if (!email || !password || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ message: 'Invalid email or password too short' }]
        });
      }
      res.json({ success: true, message: 'Login successful' });
    });

    testApp.use('/api/v2', apiRouter);
    testApp.use('/api/v2/auth', authRouter);

    // 404 handler
    testApp.use('*', (req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handling
    testApp.use(errorLoggingMiddleware);

    // Suppress logs during testing
    jest.spyOn(logger, 'debug').mockImplementation();
    jest.spyOn(logger, 'info').mockImplementation();
    jest.spyOn(logger, 'warn').mockImplementation();
    jest.spyOn(logger, 'error').mockImplementation();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Configuration Validation', () => {
    it('should have valid configuration object', () => {
      expect(appConfig).toBeDefined();
      expect(appConfig.server).toBeDefined();
      expect(appConfig.cors).toBeDefined();
      expect(appConfig.rateLimit).toBeDefined();
      expect(appConfig.server.port).toBeGreaterThan(0);
      expect(appConfig.cors.clientUrl).toBeTruthy();
    });

    it('should set environment correctly', () => {
      expect(['development', 'production', 'test']).toContain(appConfig.server.nodeEnv);
    });
  });

  describe('Health Check & Basic Response', () => {
    it('should respond to health check', async () => {
      const response = await request(testApp).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have security headers from Helmet', async () => {
      const response = await request(testApp).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('x-xss-protection', '0');
    });

    it('should have CORS headers configured', async () => {
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Rate Limiting Functionality', () => {
    it('should apply API rate limiting with correct headers', async () => {
      const response = await request(testApp).get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit', '60');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it('should apply auth rate limiting with stricter limits', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '5');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(5);
    });

    it('should track requests per endpoint separately', async () => {
      // Make multiple requests to the same endpoint
      const response1 = await request(testApp).get('/api/v2/health');
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);

      const response2 = await request(testApp).get('/api/v2/health');
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);

      // Remaining count should decrease
      expect(remaining2).toBe(remaining1 - 1);
    });
  });

  describe('Logging Middleware', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log incoming requests', async () => {
      const debugSpy = jest.spyOn(logger, 'debug');

      await request(testApp).get('/health');

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

    it('should log successful responses', async () => {
      const infoSpy = jest.spyOn(logger, 'info');

      await request(testApp).get('/health');
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

    it('should log error responses with WARN level', async () => {
      const warnSpy = jest.spyOn(logger, 'warn');

      await request(testApp)
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
    });
  });

  describe('Error Handling & Validation', () => {
    it('should handle validation errors correctly', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .send({ email: 'test', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle missing body', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(testApp).get('/non-existent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Compression & Content Handling', () => {
    it('should set correct content type for JSON', async () => {
      const response = await request(testApp).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle URL encoded data', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=test@example.com&password=password123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Performance & Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(testApp).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });

    it('should respond within reasonable time', async () => {
      const start = Date.now();
      await request(testApp).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
