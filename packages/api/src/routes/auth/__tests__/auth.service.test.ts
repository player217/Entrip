import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService } from '../auth.service';
import { prisma } from '../../../test/setup';
import { UserFactory } from '../../../test/factories/user.factory';
import { ApiError } from '../../../middlewares/error.middleware';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    // Initialize UserFactory with prisma
    UserFactory.initialize(prisma);
  });

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        role: UserRole.USER,
        department: 'Engineering',
      };

      const result = await authService.register(input, 'TEST_COMPANY');

      // Check user was created
      expect(result.user.email).toBe(input.email);
      expect(result.user.name).toBe(input.name);
      expect(result.user.companyCode).toBe('TEST_COMPANY');
      expect('password' in result.user).toBe(false); // Should be sanitized

      // Check tokens were generated
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify password was hashed in database
      const dbUser = await prisma.user.findFirst({
        where: { email: input.email },
      });
      expect(dbUser).toBeDefined();
      const isPasswordValid = await bcrypt.compare(input.password, dbUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should reject duplicate email within same company', async () => {
      const input = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        name: 'First User',
        role: UserRole.USER,
      };

      // First registration should succeed
      await authService.register(input, 'TEST_COMPANY');

      // Second registration with same email and company should fail
      await expect(
        authService.register(input, 'TEST_COMPANY')
      ).rejects.toThrow('User with this email already exists in this company');
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      // Create a user first
      const user = await UserFactory.create({
        email: 'login@example.com',
        companyCode: 'TEST_COMPANY',
      });

      const result = await authService.login({
        email: 'login@example.com',
        password: 'password123', // Factory default password
      }, 'TEST_COMPANY');

      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      await UserFactory.create({
        email: 'wrongpass@example.com',
        companyCode: 'TEST_COMPANY',
      });

      await expect(
        authService.login({
          email: 'wrongpass@example.com',
          password: 'wrongpassword',
        }, 'TEST_COMPANY')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should enforce company isolation during login', async () => {
      await UserFactory.create({
        email: 'company@example.com',
        companyCode: 'COMPANY_A',
      });

      // Try to login with correct email/password but wrong company
      await expect(
        authService.login({
          email: 'company@example.com',
          password: 'password123',
        }, 'COMPANY_B')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const user = await UserFactory.create({
        companyCode: 'TEST_COMPANY',
        role: UserRole.MANAGER,
      });

      const tokens = authService.generateTokens(user);
      const payload = await authService.verifyAccessToken(tokens.accessToken);

      expect(payload.id).toBe(user.id);
      expect(payload.email).toBe(user.email);
      expect(payload.companyCode).toBe(user.companyCode);
      expect(payload.role).toBe(UserRole.MANAGER);
    });

    it('should reject invalid access token', async () => {
      await expect(
        authService.verifyAccessToken('invalid.access.token')
      ).rejects.toThrow('Invalid access token');
    });
  });
});