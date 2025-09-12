import request from 'supertest';
import { app } from '../../../index';
import { approvalsService } from '../approvals.service';
import { financeService } from '../../finance/finance.service';
import jwt from 'jsonwebtoken';

// Mock auth middleware
jest.mock('jsonwebtoken');
jest.mock('../../finance/finance.service');

const mockFinanceService = financeService as jest.Mocked<typeof financeService>;

describe('Approval Routes', () => {
  let adminToken: string;
  let approverToken: string;
  let staffToken: string;
  let viewerToken: string;

  beforeAll(() => {
    // Mock JWT tokens
    adminToken = 'admin-token';
    approverToken = 'approver-token';
    staffToken = 'staff-token';
    viewerToken = 'viewer-token';

    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === adminToken) {
        return { id: 'admin-user', email: 'admin@test.com', role: 'admin' };
      } else if (token === approverToken) {
        return { id: 'approver-user', email: 'approver@test.com', role: 'approver' };
      } else if (token === staffToken) {
        return { id: 'staff-user', email: 'staff@test.com', role: 'staff' };
      } else if (token === viewerToken) {
        return { id: 'viewer-user', email: 'viewer@test.com', role: 'viewer' };
      }
      throw new Error('Invalid token');
    });
  });

  beforeEach(async () => {
    await approvalsService.clearAll();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/approvals', () => {
    beforeEach(async () => {
      // Create test approvals
      await approvalsService.create({
        title: 'Pending Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [
          { approverId: 'approver-user', order: 0 },
        ],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });

      await approvalsService.create({
        title: 'Another Approval',
        content: 'Test content 2',
        targetType: 'custom',
        currency: 'KRW',
        steps: [
          { approverId: 'approver-2', order: 0 },
        ],
      }, { id: 'staff-2', email: 'staff2@test.com', role: 'staff' });
    });

    it('should list approvals with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/approvals')
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

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/approvals?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((a: { status: string }) => a.status === 'pending')).toBe(true);
    });

    it('should filter by approverId', async () => {
      const response = await request(app)
        .get('/api/v1/approvals?approverId=approver-user')
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Pending Approval');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/approvals')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 for invalid query params', async () => {
      const response = await request(app)
        .get('/api/v1/approvals?page=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/approvals/stats', () => {
    beforeEach(async () => {
      const approval = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-user', order: 0 }],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });

      // Approve it
      await approvalsService.action(
        approval.id,
        { action: 'approve' },
        { id: 'approver-user', email: 'approver@test.com', role: 'approver' }
      );
    });

    it('should get statistics', async () => {
      const currentYear = new Date().getFullYear();
      const response = await request(app)
        .get(`/api/v1/approvals/stats?year=${currentYear}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        total: 1,
        pending: 0,
        approved: 1,
        rejected: 0,
        cancelled: 0,
        avgApprovalTime: expect.any(Number),
      });
    });
  });

  describe('GET /api/v1/approvals/:id', () => {
    it('should get approval by id', async () => {
      const created = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        amount: 100000,
        steps: [{ approverId: 'approver-user', order: 0 }],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });

      const response = await request(app)
        .get(`/api/v1/approvals/${created.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: created.id,
        title: 'Test Approval',
        amount: 100000,
      });
    });

    it('should return 404 for non-existent approval', async () => {
      const response = await request(app)
        .get('/api/v1/approvals/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Approval not found');
    });
  });

  describe('POST /api/v1/approvals', () => {
    const validApproval = {
      title: 'New Approval Request',
      content: 'Please approve this expense',
      targetType: 'custom',
      amount: 250000,
      currency: 'KRW',
      steps: [
        { approverId: 'approver-1', order: 0 },
        { approverId: 'approver-2', order: 1 },
      ],
    };

    it('should create approval as staff', async () => {
      const response = await request(app)
        .post('/api/v1/approvals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validApproval)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: validApproval.title,
        content: validApproval.content,
        status: 'pending',
        currentStep: 0,
        requesterId: 'staff-user',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should create approval linked to finance record', async () => {
      mockFinanceService.findById.mockResolvedValue({
        id: 'fin-123',
        type: 'expense',
        category: 'Travel',
        amount: 500000,
        currency: 'USD',
        exchangeRate: 1300,
        occurredAt: '2024-01-15T10:00:00Z',
        status: 'pending',
        createdBy: 'user-1',
        createdAt: '2024-01-15T10:00:00Z',
      });

      const response = await request(app)
        .post('/api/v1/approvals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          ...validApproval,
          targetType: 'finance',
          targetId: 'fin-123',
        })
        .expect(201);

      expect(response.body.data.targetId).toBe('fin-123');
      expect(response.body.data.amount).toBe(500000);
      expect(response.body.data.currency).toBe('USD');
    });

    it('should return 403 for viewer users', async () => {
      const response = await request(app)
        .post('/api/v1/approvals')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validApproval)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/approvals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: '', // Empty title
          content: 'Test',
          targetType: 'invalid-type',
          steps: [], // Empty steps
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for invalid finance target', async () => {
      mockFinanceService.findById.mockRejectedValue(new Error('Not found'));

      const response = await request(app)
        .post('/api/v1/approvals')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          ...validApproval,
          targetType: 'finance',
          targetId: 'invalid-fin-id',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid finance record ID');
    });
  });

  describe('PUT /api/v1/approvals/:id', () => {
    let approvalId: string;

    beforeEach(async () => {
      const approval = await approvalsService.create({
        title: 'Original Title',
        content: 'Original content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [
          { approverId: 'approver-1', order: 0 },
          { approverId: 'approver-2', order: 1 },
        ],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });
      approvalId = approval.id;
    });

    it('should update approval as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.content).toBe('Updated content');
    });

    it('should cancel approval as admin', async () => {
      const response = await request(app)
        .put(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'cancelled',
        })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .put(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent approval', async () => {
      const response = await request(app)
        .put('/api/v1/approvals/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Update',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/approvals/:id/action', () => {
    let approvalId: string;

    beforeEach(async () => {
      const approval = await approvalsService.create({
        title: 'Action Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [
          { approverId: 'approver-user', order: 0 },
          { approverId: 'approver-2', order: 1 },
        ],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });
      approvalId = approval.id;
    });

    it('should approve as approver', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/${approvalId}/action`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approve',
          comment: 'Approved with conditions',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(1);
      expect(response.body.data.steps[0].action).toBe('approve');
      expect(response.body.message).toBe('Approval approved successfully');
    });

    it('should reject as approver', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/${approvalId}/action`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'reject',
          comment: 'Missing documents',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    it('should return 403 for non-approver users', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/${approvalId}/action`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          action: 'approve',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for cancelled approval', async () => {
      // Cancel the approval first
      await approvalsService.update(
        approvalId,
        { status: 'cancelled' },
        { id: 'admin-user', email: 'admin@test.com', role: 'admin' }
      );

      const response = await request(app)
        .post(`/api/v1/approvals/${approvalId}/action`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'approve',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot approve cancelled approval');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post(`/api/v1/approvals/${approvalId}/action`)
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          action: 'invalid-action',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/v1/approvals/:id', () => {
    let approvalId: string;

    beforeEach(async () => {
      const approval = await approvalsService.create({
        title: 'To Delete',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, { id: 'staff-user', email: 'staff@test.com', role: 'staff' });
      approvalId = approval.id;
    });

    it('should delete approval as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Approval deleted successfully');

      // Verify soft delete
      await expect(approvalsService.findById(approvalId))
        .rejects.toThrow('Approval not found');
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/v1/approvals/${approvalId}`)
        .set('Authorization', `Bearer ${approverToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent approval', async () => {
      const response = await request(app)
        .delete('/api/v1/approvals/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});