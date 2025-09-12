import { approvalsService } from '../approvals.service';
import { AuthUser } from '../../../types/auth';
import { financeService } from '../../finance/finance.service';

// Mock dependencies
jest.mock('../../finance/finance.service');
jest.mock('../../../services/notifications.service', () => ({
  sendApprovalResult: jest.fn(),
}));

const mockFinanceService = financeService as jest.Mocked<typeof financeService>;

describe('ApprovalsService', () => {
  const adminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'admin',
  };

  const approverUser: AuthUser = {
    id: 'approver-1',
    email: 'approver@test.com',
    role: 'approver',
  };

  const staffUser: AuthUser = {
    id: 'staff-1',
    email: 'staff@test.com',
    role: 'staff',
  };

  beforeEach(async () => {
    await approvalsService.clearAll();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create approval request', async () => {
      const input = {
        title: 'Travel Expense Approval',
        content: 'Business trip to Seoul',
        targetType: 'custom' as const,
        currency: 'KRW',
        amount: 500000,
        steps: [
          { approverId: 'approver-1', order: 0 },
          { approverId: 'approver-2', order: 1 },
        ],
      };

      const approval = await approvalsService.create(input, staffUser);

      expect(approval).toMatchObject({
        title: input.title,
        content: input.content,
        targetType: 'custom',
        status: 'pending',
        currentStep: 0,
        requesterId: staffUser.id,
      });
      expect(approval.steps).toHaveLength(2);
      expect(approval.id).toBeDefined();
    });

    it('should sync amount from finance record', async () => {
      mockFinanceService.findById.mockResolvedValue({
        id: 'fin-123',
        type: 'expense',
        category: 'Travel',
        amount: 750000,
        currency: 'USD',
        exchangeRate: 1300,
        occurredAt: '2024-01-15T10:00:00Z',
        status: 'pending',
        createdBy: 'user-1',
        createdAt: '2024-01-15T10:00:00Z',
      });

      const input = {
        title: 'Finance Approval',
        content: 'Approve finance record',
        targetType: 'finance' as const,
        targetId: 'fin-123',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      };

      const approval = await approvalsService.create(input, staffUser);

      expect(approval.amount).toBe(750000);
      expect(approval.currency).toBe('USD');
      expect(mockFinanceService.findById).toHaveBeenCalledWith('fin-123');
    });

    it('should throw error for invalid finance record', async () => {
      mockFinanceService.findById.mockRejectedValue(new Error('Not found'));

      const input = {
        title: 'Finance Approval',
        content: 'Approve finance record',
        targetType: 'finance' as const,
        targetId: 'invalid-id',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      };

      await expect(approvalsService.create(input, staffUser))
        .rejects.toThrow('Invalid finance record ID');
    });

    it('should sort steps by order', async () => {
      const input = {
        title: 'Multi-step Approval',
        content: 'Complex approval flow',
        targetType: 'custom' as const,
        currency: 'KRW',
        steps: [
          { approverId: 'approver-3', order: 2 },
          { approverId: 'approver-1', order: 0 },
          { approverId: 'approver-2', order: 1 },
        ],
      };

      const approval = await approvalsService.create(input, staffUser);

      expect(approval.steps[0].approverId).toBe('approver-1');
      expect(approval.steps[1].approverId).toBe('approver-2');
      expect(approval.steps[2].approverId).toBe('approver-3');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test approvals
      await approvalsService.create({
        title: 'Pending Approval 1',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      const approval2 = await approvalsService.create({
        title: 'Approved Approval',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, { id: 'staff-2', email: 'staff2@test.com', role: 'staff' });

      // Approve the second one
      await approvalsService.action(approval2.id, { action: 'approve' }, approverUser);

      await approvalsService.create({
        title: 'Cancelled Approval',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-2', order: 0 }],
      }, staffUser);
    });

    it('should list all approvals', async () => {
      const result = await approvalsService.list({});

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
    });

    it('should filter by status', async () => {
      const result = await approvalsService.list({ status: 'pending' });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(a => a.status === 'pending')).toBe(true);
    });

    it('should filter by requesterId', async () => {
      const result = await approvalsService.list({ requesterId: staffUser.id });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(a => a.requesterId === staffUser.id)).toBe(true);
    });

    it('should filter by approverId', async () => {
      const result = await approvalsService.list({ approverId: 'approver-1' });

      expect(result.data).toHaveLength(2);
    });

    it('should handle pagination', async () => {
      const result = await approvalsService.list({ page: 2, limit: 2 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pages).toBe(2);
    });
  });

  describe('findById', () => {
    it('should find approval by id', async () => {
      const created = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      const found = await approvalsService.findById(created.id);

      expect(found).toEqual(created);
    });

    it('should throw error for non-existent approval', async () => {
      await expect(approvalsService.findById('non-existent'))
        .rejects.toThrow('Approval not found');
    });

    it('should throw error for deleted approval', async () => {
      const created = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      await approvalsService.delete(created.id);

      await expect(approvalsService.findById(created.id))
        .rejects.toThrow('Approval not found');
    });
  });

  describe('update', () => {
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
      }, staffUser);
      approvalId = approval.id;
    });

    it('should update title and content', async () => {
      const updated = await approvalsService.update(
        approvalId,
        {
          title: 'Updated Title',
          content: 'Updated content',
        },
        adminUser
      );

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should update steps', async () => {
      const updated = await approvalsService.update(
        approvalId,
        {
          steps: [
            { approverId: 'approver-3', order: 0 },
            { approverId: 'approver-4', order: 1 },
          ],
        },
        adminUser
      );

      expect(updated.steps).toHaveLength(2);
      expect(updated.steps[0].approverId).toBe('approver-3');
    });

    it('should cancel approval', async () => {
      const updated = await approvalsService.update(
        approvalId,
        { status: 'cancelled' },
        adminUser
      );

      expect(updated.status).toBe('cancelled');
    });

    it('should throw error for non-pending approval', async () => {
      // First approve all steps to make it approved
      await approvalsService.action(approvalId, { action: 'approve' }, approverUser);
      await approvalsService.action(approvalId, { action: 'approve' }, 
        { id: 'approver-2', email: 'approver2@test.com', role: 'approver' });

      await expect(approvalsService.update(approvalId, { title: 'New Title' }, adminUser))
        .rejects.toThrow('Cannot update non-pending approval');
    });

    it('should prevent non-admin from modifying current step', async () => {
      await expect(approvalsService.update(
        approvalId,
        {
          steps: [
            { approverId: 'approver-3', order: 0 }, // Different approver
            { approverId: 'approver-2', order: 1 },
          ],
        },
        staffUser
      )).rejects.toThrow('Cannot modify current approval step without admin role');
    });
  });

  describe('action', () => {
    let approvalId: string;

    beforeEach(async () => {
      const approval = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        amount: 100000,
        steps: [
          { approverId: 'approver-1', order: 0 },
          { approverId: 'approver-2', order: 1 },
        ],
      }, staffUser);
      approvalId = approval.id;
    });

    it('should approve step', async () => {
      const updated = await approvalsService.action(
        approvalId,
        { action: 'approve', comment: 'Looks good' },
        approverUser
      );

      expect(updated.currentStep).toBe(1);
      expect(updated.steps[0].action).toBe('approve');
      expect(updated.steps[0].comment).toBe('Looks good');
      expect(updated.steps[0].actedAt).toBeDefined();
      expect(updated.status).toBe('pending'); // Still pending, need second approval
    });

    it('should complete approval after all steps', async () => {
      await approvalsService.action(approvalId, { action: 'approve' }, approverUser);
      
      const updated = await approvalsService.action(
        approvalId,
        { action: 'approve' },
        { id: 'approver-2', email: 'approver2@test.com', role: 'approver' }
      );

      expect(updated.status).toBe('approved');
      expect(updated.currentStep).toBe(2); // Beyond last step
    });

    it('should reject approval', async () => {
      const updated = await approvalsService.action(
        approvalId,
        { action: 'reject', comment: 'Not approved' },
        approverUser
      );

      expect(updated.status).toBe('rejected');
      expect(updated.steps[0].action).toBe('reject');
      expect(updated.steps[0].comment).toBe('Not approved');
    });

    it('should prevent requester from approving', async () => {
      await expect(approvalsService.action(
        approvalId,
        { action: 'approve' },
        staffUser
      )).rejects.toThrow('Requester cannot approve their own request');
    });

    it('should prevent action on non-pending approval', async () => {
      await approvalsService.update(approvalId, { status: 'cancelled' }, adminUser);

      await expect(approvalsService.action(
        approvalId,
        { action: 'approve' },
        approverUser
      )).rejects.toThrow('Cannot approve cancelled approval');
    });

    it('should prevent unauthorized approver', async () => {
      await expect(approvalsService.action(
        approvalId,
        { action: 'approve' },
        { id: 'other-user', email: 'other@test.com', role: 'staff' }
      )).rejects.toThrow('Not authorized to approve at this step');
    });

    it('should prevent acting on already acted step', async () => {
      // Create a single-step approval for clearer testing
      const singleStepApproval = await approvalsService.create({
        title: 'Single Step',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      // First approval
      await approvalsService.action(singleStepApproval.id, { action: 'approve' }, approverUser);

      // Try to act again on the completed approval
      await expect(approvalsService.action(
        singleStepApproval.id,
        { action: 'approve' },
        approverUser
      )).rejects.toThrow('Cannot approve approved approval');
    });

    it('should allow admin to approve any step', async () => {
      const updated = await approvalsService.action(
        approvalId,
        { action: 'approve' },
        adminUser
      );

      expect(updated.currentStep).toBe(1);
      expect(updated.steps[0].action).toBe('approve');
    });
  });

  describe('delete', () => {
    it('should soft delete approval', async () => {
      const approval = await approvalsService.create({
        title: 'Test Approval',
        content: 'Test content',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      await approvalsService.delete(approval.id);

      await expect(approvalsService.findById(approval.id))
        .rejects.toThrow('Approval not found');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create various approvals
      await approvalsService.create({
        title: 'Pending 1',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      const approval2 = await approvalsService.create({
        title: 'Approved 1',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      const approval3 = await approvalsService.create({
        title: 'Rejected 1',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      const approval4 = await approvalsService.create({
        title: 'Cancelled 1',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      // Process approvals
      await approvalsService.action(approval2.id, { action: 'approve' }, approverUser);
      await approvalsService.action(approval3.id, { action: 'reject' }, approverUser);
      await approvalsService.update(approval4.id, { status: 'cancelled' }, adminUser);
    });

    it('should get statistics for current year', async () => {
      const currentYear = new Date().getFullYear();
      const stats = await approvalsService.getStats(currentYear);

      expect(stats).toEqual({
        total: 4,
        pending: 1,
        approved: 1,
        rejected: 1,
        cancelled: 1,
        avgApprovalTime: expect.any(Number),
      });
    });

    it('should get statistics for specific month', async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const stats = await approvalsService.getStats(currentYear, currentMonth);

      expect(stats.total).toBe(4);
    });

    it('should calculate average approval time', async () => {
      const currentYear = new Date().getFullYear();
      const stats = await approvalsService.getStats(currentYear);

      expect(stats.avgApprovalTime).toBeGreaterThanOrEqual(0);
    });

    it('should return empty stats for future year', async () => {
      const stats = await approvalsService.getStats(2099);

      expect(stats).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        avgApprovalTime: 0,
      });
    });
  });

  describe('clearAll', () => {
    it('should clear all approvals', async () => {
      await approvalsService.create({
        title: 'Test',
        content: 'Test',
        targetType: 'custom',
        currency: 'KRW',
        steps: [{ approverId: 'approver-1', order: 0 }],
      }, staffUser);

      await approvalsService.clearAll();

      const result = await approvalsService.list({});
      expect(result.data).toHaveLength(0);
    });
  });
});