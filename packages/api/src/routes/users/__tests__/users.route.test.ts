import request from 'supertest';
import { UserRole } from '@prisma/client';
import { app } from '../../../index';
import { prisma } from '../../../test/setup';
import { UserFactory } from '../../../test/factories/user.factory';

describe('User Routes', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  const companyCode = 'TEST_COMPANY';

  beforeAll(() => {
    UserFactory.initialize(prisma);
  });

  beforeEach(async () => {
    // Create users with different roles
    const { user: admin, tokens: adminTokens } = await UserFactory.createWithToken(UserRole.ADMIN, companyCode);
    const { user: manager, tokens: managerTokens } = await UserFactory.createWithToken(UserRole.MANAGER, companyCode);
    const { user: regularUser, tokens: userTokens } = await UserFactory.createWithToken(UserRole.USER, companyCode);

    adminToken = adminTokens.accessToken;
    managerToken = managerTokens.accessToken;
    userToken = userTokens.accessToken;
  });

  describe('GET /api/v2/users', () => {
    it('should return users for authenticated user', async () => {
      // Create additional users
      await UserFactory.createMany(3, { companyCode });

      const response = await request(app)
        .get('/api/v2/users')
        .set('Cookie', `auth-token=${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.data.length).toBeGreaterThanOrEqual(4); // 3 created + at least 1 from setup
      expect(response.body.data.data.every((u: any) => u.companyCode === companyCode)).toBe(true);
    });

    it('should support pagination', async () => {
      await UserFactory.createMany(5, { companyCode });

      const response = await request(app)
        .get('/api/v2/users?skip=2&take=2')
        .set('Cookie', `auth-token=${userToken}`)
        .expect(200);

      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.skip).toBe(2);
      expect(response.body.data.take).toBe(2);
    });

    it('should filter by role', async () => {
      await UserFactory.create({ companyCode, role: UserRole.MANAGER, email: 'manager2@test.com' });

      const response = await request(app)
        .get('/api/v2/users?role=MANAGER')
        .set('Cookie', `auth-token=${userToken}`)
        .expect(200);

      expect(response.body.data.data.every((u: any) => u.role === UserRole.MANAGER)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app)
        .get('/api/v2/users')
        .expect(401);
    });
  });

  describe('GET /api/v2/users/:id', () => {
    it('should return specific user from same company', async () => {
      const user = await UserFactory.create({ companyCode });

      const response = await request(app)
        .get(`/api/v2/users/${user.id}`)
        .set('Cookie', `auth-token=${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 404 for user from different company', async () => {
      const otherUser = await UserFactory.create({ companyCode: 'OTHER_COMPANY' });

      await request(app)
        .get(`/api/v2/users/${otherUser.id}`)
        .set('Cookie', `auth-token=${userToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v2/users', () => {
    it('should allow ADMIN to create new user', async () => {
      const newUser = {
        email: 'newuser@test.com',
        name: 'New User',
        password: 'SecurePass123',
        role: 'USER',
        department: 'Sales'
      };

      const response = await request(app)
        .post('/api/v2/users')
        .set('Cookie', `auth-token=${adminToken}`)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.companyCode).toBe(companyCode);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should prevent MANAGER from creating ADMIN user', async () => {
      const newAdmin = {
        email: 'newadmin@test.com',
        name: 'New Admin',
        password: 'SecurePass123',
        role: 'ADMIN'
      };

      await request(app)
        .post('/api/v2/users')
        .set('Cookie', `auth-token=${managerToken}`)
        .send(newAdmin)
        .expect(403);
    });

    it('should prevent USER from creating any user', async () => {
      const newUser = {
        email: 'another@test.com',
        name: 'Another User',
        password: 'password123',
        role: 'USER'
      };

      await request(app)
        .post('/api/v2/users')
        .set('Cookie', `auth-token=${userToken}`)
        .send(newUser)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        email: 'invalid-email',
        // missing name and password
      };

      const response = await request(app)
        .post('/api/v2/users')
        .set('Cookie', `auth-token=${adminToken}`)
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/v2/users/:id', () => {
    it('should allow user to update own profile', async () => {
      const { user } = await UserFactory.createWithToken(UserRole.USER, companyCode);

      const update = {
        name: 'Updated Name',
        department: 'New Department'
      };

      const response = await request(app)
        .put(`/api/v2/users/${user.id}`)
        .set('Cookie', `auth-token=${userToken}`)
        .send(update)
        .expect(200);

      expect(response.body.data.name).toBe(update.name);
      expect(response.body.data.department).toBe(update.department);
    });

    it('should allow ADMIN to update any user', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      const update = {
        name: 'Admin Updated',
        role: 'MANAGER'
      };

      const response = await request(app)
        .put(`/api/v2/users/${targetUser.id}`)
        .set('Cookie', `auth-token=${adminToken}`)
        .send(update)
        .expect(200);

      expect(response.body.data.name).toBe(update.name);
    });

    it('should prevent USER from updating other users', async () => {
      const otherUser = await UserFactory.create({ companyCode });

      await request(app)
        .put(`/api/v2/users/${otherUser.id}`)
        .set('Cookie', `auth-token=${userToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  describe('PATCH /api/v2/users/:id/role', () => {
    it('should allow ADMIN to change user role', async () => {
      const targetUser = await UserFactory.create({ companyCode, role: UserRole.USER });

      const response = await request(app)
        .patch(`/api/v2/users/${targetUser.id}/role`)
        .set('Cookie', `auth-token=${adminToken}`)
        .send({ role: 'MANAGER' })
        .expect(200);

      expect(response.body.data.role).toBe(UserRole.MANAGER);
    });

    it('should prevent MANAGER from promoting to ADMIN', async () => {
      const targetUser = await UserFactory.create({ companyCode, role: UserRole.USER });

      await request(app)
        .patch(`/api/v2/users/${targetUser.id}/role`)
        .set('Cookie', `auth-token=${managerToken}`)
        .send({ role: 'ADMIN' })
        .expect(403);
    });

    it('should prevent USER from changing roles', async () => {
      const targetUser = await UserFactory.create({ companyCode, role: UserRole.USER });

      await request(app)
        .patch(`/api/v2/users/${targetUser.id}/role`)
        .set('Cookie', `auth-token=${userToken}`)
        .send({ role: 'MANAGER' })
        .expect(403);
    });
  });

  describe('DELETE /api/v2/users/:id', () => {
    it('should allow ADMIN to soft delete user', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      await request(app)
        .delete(`/api/v2/users/${targetUser.id}`)
        .set('Cookie', `auth-token=${adminToken}`)
        .expect(204);

      // Verify user is soft deleted
      const deleted = await prisma.user.findUnique({
        where: { id: targetUser.id }
      });
      expect(deleted?.isActive).toBe(false);
    });

    it('should prevent MANAGER from deleting users', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      await request(app)
        .delete(`/api/v2/users/${targetUser.id}`)
        .set('Cookie', `auth-token=${managerToken}`)
        .expect(403);
    });

    it('should prevent deleting users from other companies', async () => {
      const otherUser = await UserFactory.create({ companyCode: 'OTHER_COMPANY' });

      await request(app)
        .delete(`/api/v2/users/${otherUser.id}`)
        .set('Cookie', `auth-token=${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v2/users/:id/reset-password', () => {
    it('should allow ADMIN to reset user password', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      await request(app)
        .post(`/api/v2/users/${targetUser.id}/reset-password`)
        .set('Cookie', `auth-token=${adminToken}`)
        .send({ newPassword: 'NewSecurePass123' })
        .expect(200);

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: targetUser.id }
      });
      expect(updatedUser?.password).not.toBe(targetUser.password);
    });

    it('should prevent non-ADMIN from resetting passwords', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      await request(app)
        .post(`/api/v2/users/${targetUser.id}/reset-password`)
        .set('Cookie', `auth-token=${managerToken}`)
        .send({ newPassword: 'HackedPass123' })
        .expect(403);
    });

    it('should validate password requirements', async () => {
      const targetUser = await UserFactory.create({ companyCode });

      const response = await request(app)
        .post(`/api/v2/users/${targetUser.id}/reset-password`)
        .set('Cookie', `auth-token=${adminToken}`)
        .send({ newPassword: '123' }) // Too short
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});