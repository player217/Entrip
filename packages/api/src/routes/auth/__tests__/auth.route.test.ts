import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from '../auth.route';
import { errorHandler } from '../../../middlewares/error.middleware';
import { authService } from '../auth.service';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRouter);
app.use(errorHandler);

describe('Auth Routes', () => {
  beforeEach(async () => {
    await authService.clearAllUsers();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'staff',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
        role: userData.role,
      });
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.message).toBe('User registered successfully');
    });

    it('should validate registration input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: 'A', // Too short
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toHaveLength(3);
    });

    it('should prevent duplicate registration', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff',
      });
    });

    it('should login successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
        role: 'staff',
      });
      
      // Check refresh token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=/);
      expect(cookies[0]).toMatch(/HttpOnly/);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should validate login input', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token in body', async () => {
      // Create user and login
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      // Extract refresh token from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const refreshToken = cookies[0].split('refreshToken=')[1].split(';')[0];

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should refresh token with cookie', async () => {
      // Create user and login
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'staff',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      
      // Check refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=;/);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user with valid token', async () => {
      // Create user and login
      await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'admin',
      });

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const accessToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        email: 'test@example.com',
        role: 'admin',
      });
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });
});