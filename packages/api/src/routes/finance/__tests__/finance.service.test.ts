import { financeService } from '../finance.service';
import { FinanceCreateInput } from '../dtos/FinanceCreate.dto';
import { FinanceUpdateInput } from '../dtos/FinanceUpdate.dto';
import { ApiError } from '../../../middlewares/error.middleware';

describe('FinanceService', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', role: 'admin' };
  
  beforeEach(async () => {
    await financeService.clearAll();
  });

  describe('create', () => {
    it('should create a new finance record', async () => {
      const input: FinanceCreateInput = {
        type: 'expense',
        category: 'Travel',
        amount: 50000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
        description: 'Taxi fare',
        accountId: 'acc-123',
      };

      const record = await financeService.create(input, mockUser);

      expect(record).toMatchObject({
        type: input.type,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        exchangeRate: input.exchangeRate,
        occurredAt: input.occurredAt,
        description: input.description,
        accountId: input.accountId,
        status: 'pending',
        createdBy: mockUser.id,
      });
      expect(record.id).toBeDefined();
      expect(record.createdAt).toBeDefined();
      expect(record.deletedAt).toBeUndefined();
    });

    it('should use default values for currency and exchangeRate', async () => {
      const input: FinanceCreateInput = {
        type: 'income',
        category: 'Sales',
        amount: 1000000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      };

      const record = await financeService.create(input, mockUser);
      
      expect(record.currency).toBe('KRW');
      expect(record.exchangeRate).toBe(1);
    });

    it('should handle different currencies', async () => {
      const input: FinanceCreateInput = {
        type: 'expense',
        category: 'Hotel',
        amount: 100,
        currency: 'USD',
        exchangeRate: 1300,
        occurredAt: '2024-01-20T15:00:00Z',
        projectId: 'proj-456',
      };

      const record = await financeService.create(input, mockUser);
      
      expect(record.currency).toBe('USD');
      expect(record.exchangeRate).toBe(1300);
      expect(record.projectId).toBe('proj-456');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test records
      const records = [
        {
          type: 'income' as const,
          category: 'Sales',
          amount: 1000000,
          currency: 'KRW',
          exchangeRate: 1,
          occurredAt: '2024-01-10T10:00:00Z',
          description: 'Product sales',
        },
        {
          type: 'expense' as const,
          category: 'Travel',
          amount: 50000,
          currency: 'KRW',
          exchangeRate: 1,
          occurredAt: '2024-01-15T14:00:00Z',
          description: 'Taxi fare',
          accountId: 'acc-123',
        },
        {
          type: 'expense' as const,
          category: 'Hotel',
          amount: 200,
          currency: 'USD',
          exchangeRate: 1300,
          occurredAt: '2024-01-20T09:00:00Z',
          projectId: 'proj-456',
        },
        {
          type: 'income' as const,
          category: 'Commission',
          amount: 500000,
          currency: 'KRW',
          exchangeRate: 1,
          occurredAt: '2024-02-01T11:00:00Z',
        },
        {
          type: 'expense' as const,
          category: 'Travel',
          amount: 30000,
          currency: 'KRW',
          exchangeRate: 1,
          occurredAt: '2024-02-05T16:00:00Z',
          description: 'Bus ticket',
        },
      ];

      for (const record of records) {
        await financeService.create(record, mockUser);
      }
    });

    it('should return paginated records', async () => {
      const result = await financeService.list({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3,
      });
    });

    it('should filter by type', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        type: 'income' 
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(r => r.type === 'income')).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        category: 'Travel' 
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(r => r.category === 'Travel')).toBe(true);
    });

    it('should filter by date range', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        dateFrom: '2024-01-15T00:00:00Z',
        dateTo: '2024-01-31T23:59:59Z',
      });

      expect(result.data).toHaveLength(2);
    });

    it('should filter by amount range', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        minAmount: 100000,
        maxAmount: 1000000,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(r => r.amount >= 100000 && r.amount <= 1000000)).toBe(true);
    });

    it('should search by keyword', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        keyword: 'taxi' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toContain('Taxi');
    });

    it('should filter by accountId', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        accountId: 'acc-123' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].accountId).toBe('acc-123');
    });

    it('should filter by projectId', async () => {
      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        projectId: 'proj-456' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].projectId).toBe('proj-456');
    });

    it('should exclude soft-deleted records by default', async () => {
      const records = await financeService.getAll();
      const toDelete = records[0];
      await financeService.delete(toDelete.id);

      const result = await financeService.list({ page: 1, limit: 20 });
      
      expect(result.data.length).toBe(4);
      expect(result.data.find(r => r.id === toDelete.id)).toBeUndefined();
    });

    it('should include deleted records when status=deleted', async () => {
      const records = await financeService.getAll();
      const toDelete = records[0];
      await financeService.delete(toDelete.id);

      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        status: 'deleted' 
      });
      
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe(toDelete.id);
    });

    it('should sort by occurredAt descending', async () => {
      const result = await financeService.list({ page: 1, limit: 20 });
      
      const dates = result.data.map(r => new Date(r.occurredAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('findById', () => {
    it('should return record by id', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'Food',
        amount: 25000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T12:00:00Z',
      }, mockUser);

      const found = await financeService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw 404 if record not found', async () => {
      await expect(financeService.findById('non-existent'))
        .rejects.toThrow(new ApiError(404, 'Finance record not found'));
    });

    it('should not return soft-deleted records', async () => {
      const created = await financeService.create({
        type: 'income',
        category: 'Refund',
        amount: 100000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      await financeService.delete(created.id);

      await expect(financeService.findById(created.id))
        .rejects.toThrow(new ApiError(404, 'Finance record not found'));
    });
  });

  describe('update', () => {
    it('should update record fields', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'Transport',
        amount: 50000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      const updateInput: FinanceUpdateInput = {
        category: 'Transportation',
        amount: 55000,
        description: 'Updated taxi fare',
        status: 'approved',
      };

      const updated = await financeService.update(created.id, updateInput, mockUser);

      expect(updated).toMatchObject({
        id: created.id,
        type: 'expense',
        category: 'Transportation',
        amount: 55000,
        description: 'Updated taxi fare',
        status: 'approved',
      });
      expect(updated.updatedAt).toBeDefined();
    });

    it('should allow status update', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'Hotel',
        amount: 300000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-20T15:00:00Z',
      }, mockUser);

      const updated = await financeService.update(created.id, {
        status: 'approved',
      }, mockUser);

      expect(updated.status).toBe('approved');
    });

    it('should clear optional fields when set to null', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'Misc',
        amount: 10000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
        description: 'Some expense',
        accountId: 'acc-123',
      }, mockUser);

      const updated = await financeService.update(created.id, {
        description: null,
        accountId: null,
      }, mockUser);

      expect(updated.description).toBeNull();
      expect(updated.accountId).toBeNull();
    });

    it('should throw 404 if record not found', async () => {
      await expect(financeService.update('non-existent', {
        category: 'Updated',
      }, mockUser)).rejects.toThrow(new ApiError(404, 'Finance record not found'));
    });
  });

  describe('delete', () => {
    it('should soft delete record', async () => {
      const created = await financeService.create({
        type: 'expense',
        category: 'To Delete',
        amount: 99999,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      await financeService.delete(created.id);

      // Get all to check soft delete
      const all = await financeService.getAll();
      const deleted = all.find(r => r.id === created.id);

      expect(deleted).toBeDefined();
      expect(deleted?.status).toBe('deleted');
      expect(deleted?.deletedAt).toBeDefined();
    });

    it('should throw 404 if record not found', async () => {
      await expect(financeService.delete('non-existent'))
        .rejects.toThrow(new ApiError(404, 'Finance record not found'));
    });

    it('should not delete already deleted record', async () => {
      const created = await financeService.create({
        type: 'income',
        category: 'Double Delete',
        amount: 777777,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      await financeService.delete(created.id);
      await expect(financeService.delete(created.id))
        .rejects.toThrow(new ApiError(404, 'Finance record not found'));
    });
  });

  describe('getStatsByMonth', () => {
    beforeEach(async () => {
      // Create records for January 2024
      await financeService.create({
        type: 'income',
        category: 'Sales',
        amount: 1000000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-10T10:00:00Z',
      }, mockUser);

      await financeService.create({
        type: 'expense',
        category: 'Travel',
        amount: 100000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      await financeService.create({
        type: 'expense',
        category: 'Travel',
        amount: 50000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-20T10:00:00Z',
      }, mockUser);

      await financeService.create({
        type: 'income',
        category: 'Commission',
        amount: 500000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-25T10:00:00Z',
      }, mockUser);

      // Create record for February 2024
      await financeService.create({
        type: 'expense',
        category: 'Hotel',
        amount: 200000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-02-05T10:00:00Z',
      }, mockUser);
    });

    it('should calculate stats for specific month', async () => {
      const stats = await financeService.getStatsByMonth(2024, 1);

      expect(stats).toEqual({
        income: 1500000,
        expense: 150000,
        balance: 1350000,
        byCategory: {
          Sales: { income: 1000000, expense: 0 },
          Travel: { income: 0, expense: 150000 },
          Commission: { income: 500000, expense: 0 },
        },
      });
    });

    it('should calculate stats for entire year when month not specified', async () => {
      const stats = await financeService.getStatsByMonth(2024);

      expect(stats).toEqual({
        income: 1500000,
        expense: 350000,
        balance: 1150000,
        byCategory: {
          Sales: { income: 1000000, expense: 0 },
          Travel: { income: 0, expense: 150000 },
          Commission: { income: 500000, expense: 0 },
          Hotel: { income: 0, expense: 200000 },
        },
      });
    });

    it('should exclude deleted and rejected records', async () => {
      const toDelete = await financeService.create({
        type: 'income',
        category: 'Deleted Income',
        amount: 999999,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-30T10:00:00Z',
      }, mockUser);

      const toReject = await financeService.create({
        type: 'expense',
        category: 'Rejected Expense',
        amount: 888888,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-30T11:00:00Z',
      }, mockUser);

      await financeService.delete(toDelete.id);
      await financeService.update(toReject.id, { status: 'rejected' }, mockUser);

      const stats = await financeService.getStatsByMonth(2024, 1);

      expect(stats.income).toBe(1500000); // Should not include deleted income
      expect(stats.expense).toBe(150000); // Should not include rejected expense
    });

    it('should handle exchange rates correctly', async () => {
      await financeService.create({
        type: 'expense',
        category: 'Hotel',
        amount: 100,
        currency: 'USD',
        exchangeRate: 1300,
        occurredAt: '2024-01-28T10:00:00Z',
      }, mockUser);

      const stats = await financeService.getStatsByMonth(2024, 1);

      expect(stats.expense).toBe(280000); // 150000 + (100 * 1300)
      expect(stats.byCategory.Hotel).toEqual({ income: 0, expense: 130000 });
    });

    it('should return zero stats for month with no records', async () => {
      const stats = await financeService.getStatsByMonth(2024, 12);

      expect(stats).toEqual({
        income: 0,
        expense: 0,
        balance: 0,
        byCategory: {},
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty keyword search', async () => {
      await financeService.create({
        type: 'expense',
        category: 'Test',
        amount: 10000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        keyword: '' 
      });

      expect(result.data).toHaveLength(1);
    });

    it('should handle pagination beyond available data', async () => {
      await financeService.create({
        type: 'income',
        category: 'Only One',
        amount: 50000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
      }, mockUser);

      const result = await financeService.list({ page: 2, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle Korean characters in search', async () => {
      await financeService.create({
        type: 'expense',
        category: '교통비',
        amount: 30000,
        currency: 'KRW',
        exchangeRate: 1,
        occurredAt: '2024-01-15T10:00:00Z',
        description: '택시 요금',
      }, mockUser);

      const result = await financeService.list({ 
        page: 1, 
        limit: 20, 
        keyword: '택시' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].description).toBe('택시 요금');
    });
  });
});