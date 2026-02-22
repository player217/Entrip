import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPI Integration', () => {
  const openApiPath = path.join(process.cwd(), 'openapi', 'openapi.json');

  beforeAll(async () => {
    // Ensure OpenAPI spec is generated before tests
    const { execSync } = require('child_process');
    try {
      execSync('npm run openapi:gen', { cwd: process.cwd(), stdio: 'pipe' });
    } catch (error) {
      console.warn('Failed to generate OpenAPI spec for tests:', error);
    }
  });

  describe('OpenAPI Generation', () => {
    it('should generate valid OpenAPI specification file', () => {
      expect(fs.existsSync(openApiPath)).toBe(true);
      
      const specContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = JSON.parse(specContent);
      
      // Validate basic OpenAPI structure
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('Entrip API');
      expect(spec.info.version).toBe('2.0.0');
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
    });

    it('should include required schemas', () => {
      const specContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = JSON.parse(specContent);
      
      const requiredSchemas = [
        'ErrorResponse',
        'Currency',
        'BookingStatus', 
        'Booking',
        'BookingListItem',
        'BookingResponse',
        'BookingListResponse'
      ];

      requiredSchemas.forEach(schemaName => {
        expect(spec.components.schemas[schemaName]).toBeDefined();
      });
    });

    it('should include API paths', () => {
      const specContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = JSON.parse(specContent);
      
      expect(spec.paths['/api/v1/bookings']).toBeDefined();
      expect(spec.paths['/api/v1/bookings/{id}']).toBeDefined();
      
      // Check HTTP methods
      expect(spec.paths['/api/v1/bookings'].get).toBeDefined();
      expect(spec.paths['/api/v1/bookings'].post).toBeDefined();
      expect(spec.paths['/api/v1/bookings/{id}'].get).toBeDefined();
    });

    it('should include security schemes', () => {
      const specContent = fs.readFileSync(openApiPath, 'utf8');
      const spec = JSON.parse(specContent);
      
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    });
  });

  describe('Documentation Endpoints', () => {
    it('should serve OpenAPI JSON at /api/openapi.json', async () => {
      const response = await request(app)
        .get('/api/openapi.json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Entrip API');
    });

    it('should serve documentation health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.data.service).toBe('documentation');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('2.0.0');
    });

    it('should serve Swagger UI at /api/docs/docs', async () => {
      const response = await request(app)
        .get('/api/docs/docs')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('Entrip API Documentation');
    });

    it('should redirect root documentation path to Swagger UI', async () => {
      await request(app)
        .get('/api/')
        .expect(302)
        .expect('Location', '/api/docs/docs');
    });

    it('should handle documentation generation failure gracefully', async () => {
      // Test when OpenAPI file doesn't exist
      const backupPath = openApiPath + '.backup';
      if (fs.existsSync(openApiPath)) {
        fs.renameSync(openApiPath, backupPath);
      }

      try {
        const response = await request(app)
          .get('/api/openapi.json')
          .expect(200);

        // Should return fallback spec
        expect(response.body.info.description).toContain('currently being generated');
      } finally {
        // Restore file if backup exists
        if (fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, openApiPath);
        }
      }
    });
  });

  describe('OpenAPI Specification Quality', () => {
    let spec: any;

    beforeAll(() => {
      const specContent = fs.readFileSync(openApiPath, 'utf8');
      spec = JSON.parse(specContent);
    });

    it('should have comprehensive error responses', () => {
      const paths = spec.paths;
      
      Object.keys(paths).forEach(path => {
        Object.keys(paths[path]).forEach(method => {
          const operation = paths[path][method];
          const responses = operation.responses;
          
          // Should have success response
          expect(responses['200'] || responses['201'] || responses['204']).toBeDefined();
          
          // Should have error responses for non-GET operations
          if (method !== 'get') {
            expect(responses['400']).toBeDefined();
            expect(responses['500']).toBeDefined();
          }
        });
      });
    });

    it('should have proper parameter validation', () => {
      const getBookingOperation = spec.paths['/api/v1/bookings/{id}'].get;
      expect(getBookingOperation.parameters).toBeDefined();
      
      const idParam = getBookingOperation.parameters.find((p: any) => p.name === 'id');
      expect(idParam).toBeDefined();
      expect(idParam.required).toBe(true);
      expect(idParam.schema.format).toBe('uuid');
    });

    it('should have proper request body validation', () => {
      const createBookingOperation = spec.paths['/api/v1/bookings'].post;
      expect(createBookingOperation.requestBody).toBeDefined();
      expect(createBookingOperation.requestBody.required).toBe(true);
      
      const schema = createBookingOperation.requestBody.content['application/json'].schema;
      expect(schema.required).toContain('code');
      expect(schema.required).toContain('customerName');
      expect(schema.required).toContain('customerPhone');
    });

    it('should have proper security configuration', () => {
      const createBookingOperation = spec.paths['/api/v1/bookings'].post;
      expect(createBookingOperation.security).toBeDefined();
      expect(createBookingOperation.security[0].bearerAuth).toBeDefined();
    });

    it('should have comprehensive schema definitions', () => {
      const bookingSchema = spec.components.schemas.Booking;
      expect(bookingSchema.properties).toBeDefined();
      expect(bookingSchema.required).toContain('id');
      expect(bookingSchema.required).toContain('code');
      expect(bookingSchema.required).toContain('status');
      
      // Check data types and formats
      expect(bookingSchema.properties.id.format).toBe('uuid');
      expect(bookingSchema.properties.customerEmail.format).toBe('email');
      expect(bookingSchema.properties.departAt.format).toBe('date-time');
    });

    it('should have proper enum definitions', () => {
      const currencySchema = spec.components.schemas.Currency;
      expect(currencySchema.enum).toEqual(['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP']);
      
      const statusSchema = spec.components.schemas.BookingStatus;
      expect(statusSchema.enum).toEqual(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED']);
    });

    it('should have proper validation patterns', () => {
      const createSchema = spec.paths['/api/v1/bookings'].post.requestBody.content['application/json'].schema;
      
      // Phone number pattern
      expect(createSchema.properties.customerPhone.pattern).toBe('^01[0-9]-?\\d{3,4}-?\\d{4}$');
      
      // Airport code pattern
      expect(createSchema.properties.itineraryFrom.pattern).toBe('^[A-Z]{3}$');
      
      // Amount pattern
      expect(createSchema.properties.amount.pattern).toBe('^\\d+(\\.\\d{1,2})?$');
      
      // Booking code pattern
      expect(createSchema.properties.code.pattern).toBe('^[A-Z0-9-]+$');
    });
  });
});