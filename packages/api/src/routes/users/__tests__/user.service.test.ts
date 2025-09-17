import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { UserService } from '../../../services/user.service';
import { prisma } from '../../../test/setup';
import { UserFactory } from '../../../test/factories/user.factory';
import { ApiError } from '../../../middlewares/error.middleware';

describe('UserService', () => {
  let userService: UserService;

  beforeAll(() => {
    UserFactory.initialize(prisma);
  });

  beforeEach(() => {
    userService = new UserService();
  });

  describe('findAll', () => {
    it('should return users from the same company only', async () => {
      // Create users in different companies
      const { companyAUser, companyBUser } = await UserFactory.createMultiCompany();
      await UserFactory.create({ companyCode: 'COMPANY_A', email: 'user2@companya.com' });

      // Get users for Company A
      const users = await userService.findAll('COMPANY_A', {});

      expect(users.users).toHaveLength(2);
      expect(users.users.every((u: any) => u.companyCode === 'COMPANY_A')).toBe(true);
      expect(users.users.some((u: any) => u.id === companyAUser.id)).toBe(true);
      expect(users.users.some((u: any) => u.id === companyBUser.id)).toBe(false);
    });

    it('should apply pagination correctly', async () => {
      // Create 5 users in same company
      await UserFactory.createMany(5, { companyCode: 'TEST_COMPANY' });

      // Get first page
      const page1 = await userService.findAll('TEST_COMPANY', { skip: 0, take: 2 });
      expect(page1.users).toHaveLength(2);
      expect(page1.total).toBe(5);

      // Get second page
      const page2 = await userService.findAll('TEST_COMPANY', { skip: 2, take: 2 });
      expect(page2.users).toHaveLength(2);

      // Ensure different users
      const page1Ids = page1.users.map((u: any) => u.id);
      const page2Ids = page2.users.map((u: any) => u.id);
      expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
    });

    it('should filter by role', async () => {
      const { admin, manager, user } = await UserFactory.createCompanyTeam('TEST_COMPANY');

      // Filter ADMIN only
      const admins = await userService.findAll('TEST_COMPANY', { role: UserRole.ADMIN });
      expect(admins.users).toHaveLength(1);
      expect(admins.users[0].id).toBe(admin.id);

      // Filter MANAGER only
      const managers = await userService.findAll('TEST_COMPANY', { role: UserRole.MANAGER });
      expect(managers.users).toHaveLength(1);
      expect(managers.users[0].id).toBe(manager.id);
    });

    it('should search by name or email', async () => {
      await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        name: 'John Doe',
        email: 'john@example.com'
      });
      await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        name: 'Jane Smith',
        email: 'jane@example.com'
      });

      // Search by name
      const johnResults = await userService.findAll('TEST_COMPANY', { search: 'John' });
      expect(johnResults.users).toHaveLength(1);
      expect(johnResults.users[0].name).toBe('John Doe');

      // Search by email
      const janeResults = await userService.findAll('TEST_COMPANY', { search: 'jane@' });
      expect(janeResults.users).toHaveLength(1);
      expect(janeResults.users[0].email).toBe('jane@example.com');
    });
  });

  describe('findById', () => {
    it('should return user from same company', async () => {
      const user = await UserFactory.create({ companyCode: 'TEST_COMPANY' });

      const found = await userService.findById(user.id, 'TEST_COMPANY');

      expect(found).toBeDefined();
      expect(found).not.toBeNull();
      expect(found!.id).toBe(user.id);
      expect(found!.companyCode).toBe('TEST_COMPANY');
    });

    it('should throw error if user from different company', async () => {
      const user = await UserFactory.create({ companyCode: 'OTHER_COMPANY' });

      await expect(
        userService.findById(user.id, 'TEST_COMPANY')
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if user not found', async () => {
      await expect(
        userService.findById('non-existent-id', 'TEST_COMPANY')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const data = {
        email: 'newuser@test.com',
        name: 'New User',
        password: 'SecurePass123',
        role: UserRole.USER,
        department: 'Sales',
        companyCode: 'TEST_COMPANY'
      };

      const created = await userService.create(data, 'TEST_COMPANY');

      expect(created.email).toBe(data.email);
      expect(created.name).toBe(data.name);
      expect(created.role).toBe(data.role);
      expect(created.department).toBe(data.department);
      expect(created.companyCode).toBe('TEST_COMPANY');

      // Verify password was hashed
      const dbUser = await prisma.user.findUnique({
        where: { id: created.id }
      });
      expect(dbUser).toBeDefined();
      const isPasswordValid = await bcrypt.compare(data.password, dbUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should prevent duplicate email within same company', async () => {
      await UserFactory.create({
        email: 'duplicate@test.com',
        companyCode: 'TEST_COMPANY'
      });

      await expect(
        userService.create({
          email: 'duplicate@test.com',
          name: 'Another User',
          password: 'password123',
          companyCode: 'TEST_COMPANY'
        }, 'TEST_COMPANY')
      ).rejects.toThrow('User with this email already exists');
    });

    it('should allow same email in different companies', async () => {
      await UserFactory.create({
        email: 'shared@test.com',
        companyCode: 'COMPANY_A'
      });

      const created = await userService.create({
        email: 'shared@test.com',
        name: 'User B',
        password: 'password123',
        companyCode: 'COMPANY_B'
      }, 'COMPANY_B');

      expect(created.email).toBe('shared@test.com');
      expect(created.companyCode).toBe('COMPANY_B');
    });
  });

  describe('update', () => {
    it('should update user in same company', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        name: 'Original Name',
        department: 'Engineering'
      });

      const updated = await userService.update(
        user.id,
        {
          name: 'Updated Name',
          department: 'Marketing'
        },
        'TEST_COMPANY'
      );

      expect(updated.name).toBe('Updated Name');
      expect(updated.department).toBe('Marketing');
      expect(updated.email).toBe(user.email); // Unchanged
    });

    it('should prevent updating user from different company', async () => {
      const user = await UserFactory.create({ companyCode: 'OTHER_COMPANY' });

      await expect(
        userService.update(
          user.id,
          { name: 'Hacked Name' },
          'TEST_COMPANY'
        )
      ).rejects.toThrow(ApiError);
    });

    it('should hash password if provided', async () => {
      const user = await UserFactory.create({ companyCode: 'TEST_COMPANY' });
      const newPassword = 'NewSecurePass456';

      await userService.update(
        user.id,
        { password: newPassword },
        'TEST_COMPANY'
      );

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      const isPasswordValid = await bcrypt.compare(newPassword, dbUser!.password);
      expect(isPasswordValid).toBe(true);
    });
  });

  describe('updateRole', () => {
    it('should allow ADMIN to update any role', async () => {
      const targetUser = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });

      const updated = await userService.updateRole(
        targetUser.id,
        UserRole.MANAGER,
        'TEST_COMPANY',
        UserRole.ADMIN
      );

      expect(updated.role).toBe(UserRole.MANAGER);
    });

    it('should prevent MANAGER from promoting to ADMIN', async () => {
      const targetUser = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });

      await expect(
        userService.updateRole(
          targetUser.id,
          UserRole.ADMIN,
          'TEST_COMPANY',
          UserRole.MANAGER
        )
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent USER from updating roles', async () => {
      const targetUser = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.USER
      });

      await expect(
        userService.updateRole(
          targetUser.id,
          UserRole.MANAGER,
          'TEST_COMPANY',
          UserRole.USER
        )
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent role updates across companies', async () => {
      const targetUser = await UserFactory.create({
        companyCode: 'OTHER_COMPANY',
        role: UserRole.USER
      });

      await expect(
        userService.updateRole(
          targetUser.id,
          UserRole.MANAGER,
          'TEST_COMPANY',
          UserRole.ADMIN
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe('delete', () => {
    it('should soft delete user in same company', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        isActive: true
      });

      await userService.delete(user.id, 'TEST_COMPANY');

      const deleted = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deleted).toBeDefined();
      expect(deleted!.isActive).toBe(false);
    });

    it('should prevent deleting user from different company', async () => {
      const user = await UserFactory.create({
        companyCode: 'OTHER_COMPANY',
        isActive: true
      });

      await expect(
        userService.delete(user.id, 'TEST_COMPANY')
      ).rejects.toThrow(ApiError);

      // Verify user was not deleted
      const stillActive = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(stillActive!.isActive).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should allow ADMIN to reset any password', async () => {
      const targetUser = await UserFactory.create({ companyCode: 'TEST_COMPANY' });
      const newPassword = 'ResetPass789';

      await userService.resetPassword(
        targetUser.id,
        newPassword,
        'TEST_COMPANY',
        UserRole.ADMIN
      );

      const dbUser = await prisma.user.findUnique({
        where: { id: targetUser.id }
      });
      const isPasswordValid = await bcrypt.compare(newPassword, dbUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should prevent non-ADMIN from resetting passwords', async () => {
      const targetUser = await UserFactory.create({ companyCode: 'TEST_COMPANY' });

      await expect(
        userService.resetPassword(
          targetUser.id,
          'newpass',
          'TEST_COMPANY',
          UserRole.MANAGER
        )
      ).rejects.toThrow('Only admins can reset passwords');
    });

    it('should prevent password reset across companies', async () => {
      const targetUser = await UserFactory.create({ companyCode: 'OTHER_COMPANY' });

      await expect(
        userService.resetPassword(
          targetUser.id,
          'newpass',
          'TEST_COMPANY',
          UserRole.ADMIN
        )
      ).rejects.toThrow(ApiError);
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password from user object', async () => {
      const user = await UserFactory.create({ companyCode: 'TEST_COMPANY' });

      // Get user with password field
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id }
      });

      const sanitized = userService.sanitizeUser(userWithPassword!);

      expect('password' in sanitized).toBe(false);
      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
    });
  });
});