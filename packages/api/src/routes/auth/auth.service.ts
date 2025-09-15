import bcrypt from 'bcryptjs';
import { User, UserRole } from '@prisma/client';
import prisma from '../../lib/prisma';
import { jwtService } from '../../lib/jwt.service';
import { RegisterInput } from './dtos/Register.dto';
import { LoginInput } from './dtos/Login.dto';
import { ApiError } from '../../middlewares/error.middleware';

// ============================================
// TYPES
// ============================================

export interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyCode: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: AuthTokens;
}

export interface RefreshTokenPayload {
  id: string;
  email: string;
  companyCode: string;
  iat?: number;
  exp?: number;
}

// ============================================
// CONFIGURATION
// ============================================

// Configuration is now handled by JWTService

// ============================================
// AUTH SERVICE
// ============================================

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput, companyCode: string = 'ENTRIP_MAIN'): Promise<AuthResponse> {
    // Check if user already exists in this company
    const existingUser = await prisma.user.findFirst({
      where: {
        email: input.email,
        companyCode: companyCode,
      },
    });

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists in this company');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role || UserRole.USER,
        department: input.department,
        companyCode: companyCode,
        isActive: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update last login
    await this.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Authenticate user login
   */
  async login(input: LoginInput, companyCode: string = 'ENTRIP_MAIN'): Promise<AuthResponse> {
    // Find user by email and company
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        companyCode: companyCode,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update last login
    await this.updateLastLogin(user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token using JWTService
      const payload = jwtService.verifyRefreshToken<RefreshTokenPayload>(refreshToken);

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          id: payload.id,
          email: payload.email,
          companyCode: payload.companyCode,
          isActive: true,
        },
      });

      if (!user) {
        throw new ApiError(401, 'User not found or inactive');
      }

      // Generate new tokens
      return this.generateTokens(user);

    } catch (error) {
      // Error handling is already done in JWTService
      throw error;
    }
  }

  /**
   * Verify access token and return user payload
   */
  async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    try {
      // Verify token using JWTService
      const payload = jwtService.verifyAccessToken<AuthTokenPayload>(token);

      // Verify user still exists and is active
      const user = await prisma.user.findFirst({
        where: {
          id: payload.id,
          email: payload.email,
          companyCode: payload.companyCode,
          isActive: true,
        },
      });

      if (!user) {
        throw new ApiError(401, 'User not found or inactive');
      }

      return payload;

    } catch (error) {
      // Error handling is already done in JWTService
      throw error;
    }
  }

  /**
   * Get user by ID with company isolation
   */
  async getUserById(id: string, companyCode: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        companyCode,
        isActive: true,
      },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string, companyCode: string): Promise<void> {
    const user = await prisma.user.findFirst({
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
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivateUser(userId: string, companyCode: string): Promise<void> {
    await prisma.user.updateMany({
      where: {
        id: userId,
        companyCode,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get users by role within company
   */
  async getUsersByRole(role: UserRole, companyCode: string): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany({
      where: {
        role,
        companyCode,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return users.map(user => this.sanitizeUser(user));
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate access and refresh tokens
   * Made public for testing purposes
   */
  generateTokens(user: User): AuthTokens {
    const accessPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyCode: user.companyCode,
    };

    const refreshPayload = {
      id: user.id,
      email: user.email,
      companyCode: user.companyCode,
    };

    // Generate tokens using JWTService - NO MORE 'as any'!
    try {
      const accessToken = jwtService.signAccessToken(accessPayload);
      const refreshToken = jwtService.signRefreshToken(refreshPayload);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new ApiError(500, 'Failed to generate authentication tokens');
    }
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Remove password from user object
   */
  private sanitizeUser(user: User): Omit<User, 'password'> {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authService = new AuthService();