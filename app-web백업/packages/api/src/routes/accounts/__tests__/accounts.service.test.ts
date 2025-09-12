import { accountsService } from '../accounts.service';
import { AccountCreateInput } from '../dtos/AccountCreate.dto';
import { AccountUpdateInput } from '../dtos/AccountUpdate.dto';
import { ApiError } from '../../../middlewares/error.middleware';

describe('AccountsService', () => {
  beforeEach(async () => {
    await accountsService.clearAll();
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const input: AccountCreateInput = {
        name: 'Test Company',
        email: 'test@company.com',
        phone: '01012345678',
        role: 'admin',
      };

      const account = await accountsService.create(input);

      expect(account).toMatchObject({
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: 'active',
      });
      expect(account.id).toBeDefined();
      expect(account.createdAt).toBeDefined();
      expect(account.deletedAt).toBeUndefined();
    });

    it('should throw error if email already exists', async () => {
      const input: AccountCreateInput = {
        name: 'Test Company',
        email: 'duplicate@company.com',
        role: 'staff',
      };

      await accountsService.create(input);

      await expect(accountsService.create(input))
        .rejects.toThrow(new ApiError(409, 'Email already exists'));
    });

    it('should create account without phone', async () => {
      const input: AccountCreateInput = {
        name: 'No Phone Company',
        email: 'nophone@company.com',
        role: 'viewer',
      };

      const account = await accountsService.create(input);
      expect(account.phone).toBeUndefined();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create test accounts
      const accounts = [
        { name: 'Admin Company', email: 'admin@test.com', role: 'admin' as const },
        { name: 'Staff Company', email: 'staff@test.com', role: 'staff' as const },
        { name: 'Viewer Company', email: 'viewer@test.com', role: 'viewer' as const },
        { name: 'Another Admin', email: 'admin2@test.com', role: 'admin' as const },
        { name: 'Suspended Account', email: 'suspended@test.com', role: 'staff' as const },
      ];

      for (const acc of accounts) {
        await accountsService.create(acc);
      }

      // Suspend one account
      const allAccounts = await accountsService.getAll();
      const suspendedAccount = allAccounts.find(a => a.email === 'suspended@test.com');
      if (suspendedAccount) {
        await accountsService.update(suspendedAccount.id, { status: 'suspended' });
      }
    });

    it('should return paginated accounts', async () => {
      const result = await accountsService.list({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3,
      });
    });

    it('should filter by role', async () => {
      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        role: 'admin' 
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(a => a.role === 'admin')).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        status: 'suspended' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('suspended');
    });

    it('should search by keyword in name or email', async () => {
      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        keyword: 'admin' 
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(a => 
        a.name.toLowerCase().includes('admin') || 
        a.email.toLowerCase().includes('admin')
      )).toBe(true);
    });

    it('should exclude soft-deleted accounts by default', async () => {
      const accounts = await accountsService.getAll();
      const toDelete = accounts[0];
      await accountsService.delete(toDelete.id);

      const result = await accountsService.list({ page: 1, limit: 20 });
      
      expect(result.data.length).toBe(4);
      expect(result.data.find(a => a.id === toDelete.id)).toBeUndefined();
    });

    it('should include deleted accounts when status=deleted', async () => {
      const accounts = await accountsService.getAll();
      const toDelete = accounts[0];
      await accountsService.delete(toDelete.id);

      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        status: 'deleted' 
      });
      
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe(toDelete.id);
    });
  });

  describe('findById', () => {
    it('should return account by id', async () => {
      const created = await accountsService.create({
        name: 'Find Me',
        email: 'findme@test.com',
        role: 'staff',
      });

      const found = await accountsService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw 404 if account not found', async () => {
      await expect(accountsService.findById('non-existent'))
        .rejects.toThrow(new ApiError(404, 'Account not found'));
    });

    it('should not return soft-deleted accounts', async () => {
      const created = await accountsService.create({
        name: 'To Delete',
        email: 'delete@test.com',
        role: 'viewer',
      });

      await accountsService.delete(created.id);

      await expect(accountsService.findById(created.id))
        .rejects.toThrow(new ApiError(404, 'Account not found'));
    });
  });

  describe('findByEmail', () => {
    it('should find account by email', async () => {
      const created = await accountsService.create({
        name: 'Email Test',
        email: 'unique@test.com',
        role: 'admin',
      });

      const found = await accountsService.findByEmail('unique@test.com');
      expect(found).toEqual(created);
    });

    it('should return undefined if email not found', async () => {
      const found = await accountsService.findByEmail('notfound@test.com');
      expect(found).toBeUndefined();
    });

    it('should not return soft-deleted accounts', async () => {
      const created = await accountsService.create({
        name: 'To Delete',
        email: 'deleted@test.com',
        role: 'staff',
      });

      await accountsService.delete(created.id);

      const found = await accountsService.findByEmail('deleted@test.com');
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update account fields', async () => {
      const created = await accountsService.create({
        name: 'Original Name',
        email: 'original@test.com',
        role: 'staff',
      });

      const updateInput: AccountUpdateInput = {
        name: 'Updated Name',
        phone: '01098765432',
        role: 'admin',
      };

      const updated = await accountsService.update(created.id, updateInput);

      expect(updated).toMatchObject({
        id: created.id,
        name: 'Updated Name',
        email: 'original@test.com',
        phone: '01098765432',
        role: 'admin',
      });
      expect(updated.updatedAt).toBeDefined();
    });

    it('should allow email update if new email is unique', async () => {
      const created = await accountsService.create({
        name: 'Test',
        email: 'old@test.com',
        role: 'staff',
      });

      const updated = await accountsService.update(created.id, {
        email: 'new@test.com',
      });

      expect(updated.email).toBe('new@test.com');
    });

    it('should throw error if updating to existing email', async () => {
      await accountsService.create({
        name: 'First',
        email: 'first@test.com',
        role: 'admin',
      });

      const second = await accountsService.create({
        name: 'Second',
        email: 'second@test.com',
        role: 'staff',
      });

      await expect(accountsService.update(second.id, {
        email: 'first@test.com',
      })).rejects.toThrow(new ApiError(409, 'Email already exists'));
    });

    it('should update status', async () => {
      const created = await accountsService.create({
        name: 'Test',
        email: 'status@test.com',
        role: 'viewer',
      });

      const updated = await accountsService.update(created.id, {
        status: 'suspended',
      });

      expect(updated.status).toBe('suspended');
    });

    it('should clear phone when set to null', async () => {
      const created = await accountsService.create({
        name: 'Test',
        email: 'phone@test.com',
        phone: '01012345678',
        role: 'staff',
      });

      const updated = await accountsService.update(created.id, {
        phone: null,
      });

      expect(updated.phone).toBeNull();
    });

    it('should throw 404 if account not found', async () => {
      await expect(accountsService.update('non-existent', {
        name: 'New Name',
      })).rejects.toThrow(new ApiError(404, 'Account not found'));
    });
  });

  describe('delete', () => {
    it('should soft delete account', async () => {
      const created = await accountsService.create({
        name: 'To Delete',
        email: 'delete@test.com',
        role: 'viewer',
      });

      await accountsService.delete(created.id);

      // Get all to check soft delete
      const all = await accountsService.getAll();
      const deleted = all.find(a => a.id === created.id);

      expect(deleted).toBeDefined();
      expect(deleted?.status).toBe('deleted');
      expect(deleted?.deletedAt).toBeDefined();
    });

    it('should throw 404 if account not found', async () => {
      await expect(accountsService.delete('non-existent'))
        .rejects.toThrow(new ApiError(404, 'Account not found'));
    });

    it('should not delete already deleted account', async () => {
      const created = await accountsService.create({
        name: 'Double Delete',
        email: 'double@test.com',
        role: 'admin',
      });

      await accountsService.delete(created.id);
      await expect(accountsService.delete(created.id))
        .rejects.toThrow(new ApiError(404, 'Account not found'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty keyword search', async () => {
      await accountsService.create({
        name: 'Test',
        email: 'test@test.com',
        role: 'admin',
      });

      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        keyword: '' 
      });

      expect(result.data).toHaveLength(1);
    });

    it('should handle pagination beyond available data', async () => {
      await accountsService.create({
        name: 'Only One',
        email: 'only@test.com',
        role: 'staff',
      });

      const result = await accountsService.list({ page: 2, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(1);
    });

    it('should handle Korean characters in search', async () => {
      await accountsService.create({
        name: '한국회사',
        email: 'korea@test.com',
        role: 'admin',
      });

      const result = await accountsService.list({ 
        page: 1, 
        limit: 20, 
        keyword: '한국' 
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('한국회사');
    });
  });
});