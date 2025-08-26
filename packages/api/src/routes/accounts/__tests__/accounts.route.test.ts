import request from 'supertest';
import { app } from '../../../index';
import { accountsService } from '../accounts.service';
import jwt from 'jsonwebtoken';

// Mock auth middleware for testing
jest.mock('jsonwebtoken');

describe('Accounts Routes', () => {
  let adminToken: string;
  let staffToken: string;
  let viewerToken: string;

  beforeAll(() => {
    // Mock JWT tokens
    adminToken = 'admin-token';
    staffToken = 'staff-token';
    viewerToken = 'viewer-token';

    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === adminToken) {
        return { id: 'admin-user', email: 'admin@test.com', role: 'admin' };
      } else if (token === staffToken) {
        return { id: 'staff-user', email: 'staff@test.com', role: 'staff' };
      } else if (token === viewerToken) {
        return { id: 'viewer-user', email: 'viewer@test.com', role: 'viewer' };
      }
      throw new Error('Invalid token');
    });
  });

  beforeEach(async () => {
    await accountsService.clearAll();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/accounts', () => {
    beforeEach(async () => {
      // Create test accounts
      await accountsService.create({
        name: 'Admin Company',
        email: 'admin@company.com',
        role: 'admin',
      });
      await accountsService.create({
        name: 'Staff Company',
        email: 'staff@company.com',
        role: 'staff',
      });
    });

    it('should list accounts with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      });
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?role=admin')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe('admin');
    });

    it('should search by keyword', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?keyword=staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Staff Company');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?page=2&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/accounts')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 for invalid query params', async () => {
      const response = await request(app)
        .get('/api/v1/accounts?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/accounts/:id', () => {
    it('should get account by id', async () => {
      const created = await accountsService.create({
        name: 'Test Company',
        email: 'test@company.com',
        role: 'staff',
      });

      const response = await request(app)
        .get(`/api/v1/accounts/${created.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: created.id,
        name: 'Test Company',
        email: 'test@company.com',
        role: 'staff',
      });
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .get('/api/v1/accounts/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account not found');
    });
  });

  describe('POST /api/v1/accounts', () => {
    const validAccount = {
      name: 'New Company',
      email: 'new@company.com',
      phone: '01012345678',
      role: 'staff',
    };

    it('should create account as admin', async () => {
      const response = await request(app)
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validAccount)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: validAccount.name,
        email: validAccount.email,
        phone: validAccount.phone,
        role: validAccount.role,
        status: 'active',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validAccount)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test',
          email: 'invalid-email',
          role: 'invalid-role',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      await accountsService.create(validAccount);

      const response = await request(app)
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validAccount)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });

    it('should validate phone format', async () => {
      const response = await request(app)
        .post('/api/v1/accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validAccount,
          phone: '123-456-7890', // Invalid format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/v1/accounts/:id', () => {
    let accountId: string;

    beforeEach(async () => {
      const account = await accountsService.create({
        name: 'Original Company',
        email: 'original@company.com',
        role: 'staff',
      });
      accountId = account.id;
    });

    it('should update account as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Company',
          phone: '01098765432',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: accountId,
        name: 'Updated Company',
        email: 'original@company.com',
        phone: '01098765432',
      });
    });

    it('should update account status', async () => {
      const response = await request(app)
        .put(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
        })
        .expect(200);

      expect(response.body.data.status).toBe('suspended');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Unauthorized Update',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .put('/api/v1/accounts/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Update',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 when updating to existing email', async () => {
      await accountsService.create({
        name: 'Another Company',
        email: 'another@company.com',
        role: 'viewer',
      });

      const response = await request(app)
        .put(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'another@company.com',
        })
        .expect(409);

      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('DELETE /api/v1/accounts/:id', () => {
    let accountId: string;

    beforeEach(async () => {
      const account = await accountsService.create({
        name: 'To Delete',
        email: 'delete@company.com',
        role: 'viewer',
      });
      accountId = account.id;
    });

    it('should delete account as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account deleted successfully');

      // Verify soft delete
      await expect(accountsService.findById(accountId))
        .rejects.toThrow('Account not found');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/accounts/${accountId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .delete('/api/v1/accounts/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});