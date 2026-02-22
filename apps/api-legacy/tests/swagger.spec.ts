import request from 'supertest';
import express from 'express';

describe('Swagger UI', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear module cache to reload app with new env
    jest.resetModules();
  });

  describe('Development environment', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      const { default: appModule } = await import('../src/app');
      app = appModule;
    });

    it('GET /docs returns 200', async () => {
      const res = await request(app).get('/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Swagger UI');
    });

    it('serves static assets', async () => {
      const res = await request(app).get('/docs/swagger-ui-init.js');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('javascript');
    });
  });

  describe('Production environment', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      const { default: appModule } = await import('../src/app');
      app = appModule;
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('GET /docs returns 404', async () => {
      const res = await request(app).get('/docs');
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Swagger UI is disabled in production');
    });
  });

  describe('OpenAPI JSON endpoint', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      const { default: appModule } = await import('../src/app');
      app = appModule;
    });

    it('GET /openapi.json returns 200 & JSON', async () => {
      const res = await request(app).get('/openapi.json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('openapi');
      expect(res.body).toHaveProperty('info');
    });
  });

  describe('Health check endpoint', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      const { default: appModule } = await import('../src/app');
      app = appModule;
    });

    it('GET /healthz returns ok', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/v1/health still works', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});