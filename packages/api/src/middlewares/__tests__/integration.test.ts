import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Import our middleware and configuration
import { appConfig } from '../../config';
import { logger } from '../../lib/logger';
import { loggingMiddleware } from '../logging.middleware';
import { apiRateLimit, authRateLimit } from '../rateLimit.middleware';

// Mock logger to avoid actual logging during tests
jest.mock('../../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
  },
}));

describe('Middleware Integration Tests', () => {
  let testApp: express.Application;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test app with our middleware stack
    testApp = express();

    // Apply middleware in the same order as main app
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
  });

  describe('Configuration System', () => {
    it('should have valid configuration', () => {
      expect(appConfig).toBeDefined();
      expect(appConfig.server).toBeDefined();
      expect(appConfig.cors).toBeDefined();
      expect(appConfig.rateLimit).toBeDefined();

      expect(typeof appConfig.server.port).toBe('number');
      expect(appConfig.server.port).toBeGreaterThan(0);
      expect(typeof appConfig.cors.clientUrl).toBe('string');
      expect(appConfig.cors.clientUrl).toBeTruthy();
    });

    it('should validate environment settings', () => {
      expect(['development', 'production', 'test']).toContain(appConfig.server.nodeEnv);
      expect(typeof appConfig.server.isDevelopment).toBe('boolean');
      expect(typeof appConfig.server.isProduction).toBe('boolean');
      expect(typeof appConfig.server.isTest).toBe('boolean');
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('should add security headers to responses', async () => {
      const response = await request(testApp).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).toHaveProperty('x-xss-protection', '0');
      expect(response.headers).toHaveProperty('referrer-policy', 'no-referrer');
    });

    it('should set Content Security Policy', async () => {
      const response = await request(testApp).get('/health');
      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow configured origin', async () => {
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(testApp)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply general rate limiting to API routes', async () => {
      const response = await request(testApp).get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit', '60');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');

      const remaining = parseInt(response.headers['x-ratelimit-remaining'], 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(60);
    });

    it('should apply stricter rate limiting to auth routes', async () => {
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

    it('should track rate limits per request', async () => {
      const response1 = await request(testApp).get('/api/v2/health');
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'], 10);

      const response2 = await request(testApp).get('/api/v2/health');
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'], 10);

      expect(remaining2).toBe(remaining1 - 1);
    });
  });

  describe('Logging Middleware', () => {
    it('should log incoming requests', async () => {
      await request(testApp).get('/health');

      expect(mockLogger.debug).toHaveBeenCalledWith(
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
      await request(testApp).get('/health');

      expect(mockLogger.http).toHaveBeenCalledWith(
        'GET',
        '/health',
        200,
        expect.any(Number), // duration
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: expect.any(String),
          responseSize: expect.any(Number),
        })
      );
    });

    it('should log error responses appropriately', async () => {
      await request(testApp)
        .post('/api/v2/auth/login')
        .send({ email: 'invalid', password: 'short' });

      expect(mockLogger.http).toHaveBeenCalledWith(
        'POST',
        '/api/v2/auth/login',
        400,
        expect.any(Number),
        expect.objectContaining({
          ip: expect.any(String),
          userAgent: expect.any(String),
          responseSize: expect.any(Number),
        })
      );
    });
  });

  describe('Request Processing', () => {
    it('should parse JSON bodies correctly', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=test@example.com&password=password123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Response Headers & Content', () => {
    it('should set correct Content-Type for JSON responses', async () => {
      const response = await request(testApp).get('/health');

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeInstanceOf(Object);
    });

    it('should include compression middleware', async () => {
      const response = await request(testApp)
        .get('/health')
        .set('Accept-Encoding', 'gzip');

      expect(response.status).toBe(200);
      // Compression is handled automatically by the middleware
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(testApp).get('/non-existent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not found');
    });

    it('should validate request data', async () => {
      const response = await request(testApp)
        .post('/api/v2/auth/login')
        .send({ email: 'test', password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Validation failed');
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, () =>
        request(testApp).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
      });
    });

    it('should respond quickly', async () => {
      const start = Date.now();
      await request(testApp).get('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500); // Should respond within 500ms
    });
  });
});