import { User, UserRole, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authService } from '../../routes/auth/auth.service';

/**
 * Factory for creating test users
 */
export class UserFactory {
  private static prisma: PrismaClient;

  /**
   * Initialize factory with Prisma client
   */
  static initialize(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a test user
   */
  static async create(overrides?: Partial<User>): Promise<User> {
    if (!this.prisma) {
      throw new Error('UserFactory not initialized. Call initialize() first.');
    }

    const timestamp = Date.now();
    const defaultData = {
      email: `test-${timestamp}@example.com`,
      password: await bcrypt.hash('password123', 10),
      name: `Test User ${timestamp}`,
      role: UserRole.USER,
      companyCode: 'TEST_COMPANY',
      department: 'Engineering',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    return this.prisma.user.create({
      data: { ...defaultData, ...overrides } as any,
    });
  }

  /**
   * Create a user with authentication tokens
   */
  static async createWithToken(role: UserRole = UserRole.USER, companyCode: string = 'TEST_COMPANY') {
    const user = await this.create({ role, companyCode });

    // Generate tokens using auth service
    const tokens = await authService.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Create multiple users
   */
  static async createMany(count: number, overrides?: Partial<User>): Promise<User[]> {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = await this.create({
        email: `test-user-${i}@example.com`,
        name: `Test User ${i}`,
        ...overrides,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Create users with different roles in same company
   */
  static async createCompanyTeam(companyCode: string = 'TEST_COMPANY') {
    const admin = await this.create({
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      companyCode,
    });

    const manager = await this.create({
      email: 'manager@test.com',
      name: 'Manager User',
      role: UserRole.MANAGER,
      companyCode,
    });

    const user = await this.create({
      email: 'user@test.com',
      name: 'Regular User',
      role: UserRole.USER,
      companyCode,
    });

    return { admin, manager, user };
  }

  /**
   * Create users in different companies
   */
  static async createMultiCompany() {
    const companyAUser = await this.create({
      email: 'user@companya.com',
      companyCode: 'COMPANY_A',
    });

    const companyBUser = await this.create({
      email: 'user@companyb.com',
      companyCode: 'COMPANY_B',
    });

    return { companyAUser, companyBUser };
  }
}