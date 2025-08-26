import request from 'supertest';
import { app } from '../../../index';
import { financeService } from '../finance.service';
import jwt from 'jsonwebtoken';

// Mock auth middleware for testing
jest.mock('jsonwebtoken');

describe('Finance Routes', () => {
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
    await financeService.clearAll();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/finance', () => {
    beforeEach(async () => {
      // Create test records
      await financeService.create({
        type: 'income',
        category: 'Sales',
        amount: 1000000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-10T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });

      await financeService.create({
        type: 'expense',
        category: 'Travel',
        amount: 50000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });
    });

    it('should list finance records with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/finance')
        .set('Authorization', `Bearer ${staffToken}`)
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

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/finance?type=income')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('income');
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/finance?dateFrom=2024-01-14T00:00:00Z&dateTo=2024-01-16T00:00:00Z')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('Travel');
    });

    it('should filter by amount range', async () => {
      const response = await request(app)
        .get('/api/v1/finance?minAmount=100000&maxAmount=2000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].amount).toBe(1000000);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/finance')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 for invalid query params', async () => {
      const response = await request(app)
        .get('/api/v1/finance?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/finance/stats', () => {
    beforeEach(async () => {
      await financeService.create({
        type: 'income',
        category: 'Sales',
        amount: 1000000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-10T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });

      await financeService.create({
        type: 'expense',
        category: 'Travel',
        amount: 100000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });
    });

    it('should get statistics for specific month', async () => {
      const response = await request(app)
        .get('/api/v1/finance/stats?year=2024&month=1')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        income: 1000000,
        expense: 100000,
        balance: 900000,
        byCategory: {
          Sales: { income: 1000000, expense: 0 },
          Travel: { income: 0, expense: 100000 },
        },
      });
    });

    it('should get statistics for entire year', async () => {
      const response = await request(app)
        .get('/api/v1/finance/stats?year=2024')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.income).toBe(1000000);
      expect(response.body.data.expense).toBe(100000);
    });

    it('should return 400 for invalid year format', async () => {
      const response = await request(app)
        .get('/api/v1/finance/stats?year=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 for year out of range', async () => {
      const response = await request(app)
        .get('/api/v1/finance/stats?year=1999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid month', async () => {
      const response = await request(app)
        .get('/api/v1/finance/stats?year=2024&month=13')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/finance/:id', () => {
    it('should get finance record by id', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'Hotel',
        amount: 200000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-20T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });

      const response = await request(app)
        .get(`/api/v1/finance/${created.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: created.id,
        type: 'expense',
        category: 'Hotel',
        amount: 200000,
      });
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .get('/api/v1/finance/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Finance record not found');
    });
  });

  describe('POST /api/v1/finance', () => {
    const validRecord = {
      type: 'expense',
      category: 'Transportation',
      amount: 30000,
      currency: 'KRW',
      exchangeRate: 1,
      occurredAt: '2024-01-25T15:00:00Z',
      description: 'Taxi to client meeting',
    };

    it('should create record as admin', async () => {
      const response = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRecord)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: validRecord.type,
        category: validRecord.category,
        amount: validRecord.amount,
        currency: validRecord.currency,
        status: 'pending',
        createdBy: 'admin-user',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should create record as staff', async () => {
      const response = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validRecord)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.createdBy).toBe('staff-user');
    });

    it('should return 403 for viewer users', async () => {
      const response = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validRecord)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'invalid-type',
          category: '',
          amount: -100,
          currency: 'INVALID',
          occurredAt: 'not-a-date',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should use default currency KRW', async () => {
      const response = await request(app)
        .post('/api/v1/finance')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          type: 'income',
          category: 'Commission',
          amount: 500000,
          occurredAt: '2024-01-30T10:00:00Z',
        })
        .expect(201);

      expect(response.body.data.currency).toBe('KRW');
      expect(response.body.data.exchangeRate).toBe(1);
    });
  });

  describe('PUT /api/v1/finance/:id', () => {
    let recordId: string;

    beforeEach(async () => {
      const record = await financeService.create({
        type: 'expense',
        category: 'Original Category',
        amount: 100000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });
      recordId = record.id;
    });

    it('should update record as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/finance/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Updated Category',
          amount: 150000,
          status: 'approved',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: recordId,
        category: 'Updated Category',
        amount: 150000,
        status: 'approved',
      });
    });

    it('should update record as staff', async () => {
      const response = await request(app)
        .put(`/api/v1/finance/${recordId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          description: 'Added description',
        })
        .expect(200);

      expect(response.body.data.description).toBe('Added description');
    });

    it('should return 403 for viewer users', async () => {
      const response = await request(app)
        .put(`/api/v1/finance/${recordId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          category: 'Unauthorized Update',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .put('/api/v1/finance/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Update',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/finance/:id', () => {
    let recordId: string;

    beforeEach(async () => {
      const record = await financeService.create({
        type: 'expense',
        category: 'To Delete',
        amount: 99999,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });
      recordId = record.id;
    });

    it('should delete record as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/finance/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Finance record deleted successfully');

      // Verify soft delete
      await expect(financeService.findById(recordId))
        .rejects.toThrow('Finance record not found');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/finance/${recordId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .delete('/api/v1/finance/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/finance/:id/approve', () => {
    let recordId: string;

    beforeEach(async () => {
      const record = await financeService.create({
        type: 'expense',
        category: 'Pending Approval',
        amount: 500000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, { id: 'admin-user', email: 'admin@test.com', role: 'admin' });
      recordId = record.id;
    });

    it('should approve record as admin', async () => {
      const response = await request(app)
        .patch(`/api/v1/finance/${recordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          remarks: 'Approved for payment',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedBy).toBe('admin-user');
      expect(response.body.data.approvedAt).toBeDefined();
    });

    it('should reject record as admin', async () => {
      const response = await request(app)
        .patch(`/api/v1/finance/${recordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          remarks: 'Missing receipts',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectedBy).toBe('admin-user');
      expect(response.body.data.rejectedAt).toBeDefined();
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .patch(`/api/v1/finance/${recordId}/approve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'approved',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return error if already approved', async () => {
      // First approve
      await financeService.updateApprovalStatus(
        recordId, 
        'approved', 
        { id: 'admin-user', email: 'admin@test.com', role: 'admin' }
      );

      // Try to approve again
      const response = await request(app)
        .patch(`/api/v1/finance/${recordId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update status');
    });
  });
});