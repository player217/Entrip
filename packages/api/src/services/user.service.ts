import { User, UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
// import { BaseService } from './base.service';
import prisma from '../lib/prisma';
import { ApiError } from '../middlewares/error.middleware';

export interface UserCreateInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  department?: string;
  companyCode: string;
}

export interface UserUpdateInput {
  name?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  password?: string;
}

export interface UserListOptions {
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

export class UserService {
  private model = prisma.user;

  constructor() {
    // Initialize if needed
  }

  /**
   * Create a new user with password hashing
   */
  async create(data: UserCreateInput, companyCode: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.model.findFirst({
      where: {
        email: data.email,
        companyCode,
      },
    });

    if (existingUser) {
      throw new ApiError(409, `User with email ${data.email} already exists in this company`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    return await this.model.create({
      data: {
        ...data,
        password: hashedPassword,
        companyCode,
        isActive: true,
      },
    });
  }

  /**
   * Update user information
   */
  async update(
    id: string,
    data: UserUpdateInput,
    companyCode: string
  ): Promise<User> {
    // Verify user exists and belongs to company
    const user = await this.findById(id, companyCode);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Hash password if provided
    let updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return await this.model.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all users with filtering and pagination
   */
  async findAll(
    companyCode: string,
    options: UserListOptions = {}
  ): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    const {
      role,
      department,
      isActive = true,
      search,
      skip = 0,
      take = 50,
      orderBy = { name: 'asc' },
    } = options;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      companyCode,
      isActive,
      ...(role && { role }),
      ...(department && { department }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get users and count
    const [users, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users: sanitizedUsers,
      total,
    };
  }

  /**
   * Get user by ID without password
   */
  async findById(id: string, companyCode: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.model.findFirst({
      where: {
        id,
        companyCode,
        isActive: true,
      },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string, companyCode: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.model.findFirst({
      where: {
        email,
        companyCode,
        isActive: true,
      },
    });

    if (!user) return null;

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    companyCode: string
  ): Promise<void> {
    const user = await this.model.findFirst({
      where: {
        id: userId,
        companyCode,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.model.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(
    userId: string,
    newPassword: string,
    companyCode: string,
    adminRole: UserRole
  ): Promise<void> {
    // Check if requester is admin
    if (adminRole !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can reset passwords');
    }

    const user = await this.model.findFirst({
      where: {
        id: userId,
        companyCode,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.model.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string, companyCode: string): Promise<void> {
    const user = await this.findById(id, companyCode);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    await this.model.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Reactivate user
   */
  async reactivate(id: string, companyCode: string): Promise<User> {
    const user = await this.model.findFirst({
      where: {
        id,
        companyCode,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return await this.model.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get users by department
   */
  async findByDepartment(
    department: string,
    companyCode: string
  ): Promise<Omit<User, 'password'>[]> {
    const users = await this.model.findMany({
      where: {
        department,
        companyCode,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Get user statistics for a company
   */
  async getStatistics(companyCode: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    const [total, active, inactive, byRole, byDepartment] = await Promise.all([
      this.model.count({ where: { companyCode } }),
      this.model.count({ where: { companyCode, isActive: true } }),
      this.model.count({ where: { companyCode, isActive: false } }),
      this.model.groupBy({
        by: ['role'],
        where: { companyCode, isActive: true },
        _count: { id: true },
      }),
      this.model.groupBy({
        by: ['department'],
        where: { companyCode, isActive: true, department: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byDepartment: byDepartment.reduce((acc, item) => {
        acc[item.department || 'Unknown'] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Update user role (admin function)
   */
  async updateRole(
    userId: string,
    newRole: UserRole,
    companyCode: string,
    requesterRole: UserRole
  ): Promise<User> {
    // Permission check
    if (requesterRole === UserRole.USER) {
      throw new ApiError(403, 'Insufficient permissions to update roles');
    }

    // MANAGER can only promote to USER or MANAGER, not ADMIN
    if (requesterRole === UserRole.MANAGER && newRole === UserRole.ADMIN) {
      throw new ApiError(403, 'Insufficient permissions to promote to ADMIN');
    }

    // Verify user exists and belongs to company
    const user = await this.findById(userId, companyCode);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return await this.model.update({
      where: { id: userId },
      data: {
        role: newRole,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string, companyCode: string): Promise<void> {
    await this.deactivate(id, companyCode);
  }

  /**
   * Sanitize user object by removing password
   */
  sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Bulk create users (for admin import)
   */
  async bulkCreate(
    users: UserCreateInput[],
    companyCode: string,
    adminRole: UserRole
  ): Promise<{ created: number; failed: string[] }> {
    // Check if requester is admin
    if (adminRole !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can bulk create users');
    }

    const created: User[] = [];
    const failed: string[] = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await this.model.findFirst({
          where: {
            email: userData.email,
            companyCode,
          },
        });

        if (existing) {
          failed.push(`${userData.email} - already exists`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create user
        const user = await this.model.create({
          data: {
            ...userData,
            password: hashedPassword,
            companyCode,
            isActive: true,
          },
        });

        created.push(user);
      } catch (error) {
        failed.push(`${userData.email} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      created: created.length,
      failed,
    };
  }
}

export const userService = new UserService();