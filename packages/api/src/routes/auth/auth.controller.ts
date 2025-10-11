import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService, AuthTokenPayload } from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { RegisterInput } from './dtos/Register.dto';
import { LoginInput } from './dtos/Login.dto';

export class AuthController {
  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: RegisterInput = req.body;
      const companyCode = req.body.companyCode || req.headers['x-company-code'] || 'ENTRIP_MAIN';

      const result = await authService.register(input, companyCode as string);

      // Set auth token as HttpOnly cookie
      res.cookie('auth-token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Set refresh token cookie
      res.cookie('refresh-token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          // Tokens are set as HttpOnly cookies, not returned in response
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Authenticate user login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: LoginInput = req.body;
      const companyCode = req.body.companyCode || req.headers['x-company-code'] || 'ENTRIP_MAIN';

      const result = await authService.login(input, companyCode as string);

      // Set auth token as HttpOnly cookie
      res.cookie('auth-token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Set refresh token cookie
      res.cookie('refresh-token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.json({
        success: true,
        user: result.user,
        message: '로그인 성공',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies?.['refresh-token'];

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Refresh token is required',
        });
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // Update auth token cookie
      res.cookie('auth-token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Update refresh token cookie
      res.cookie('refresh-token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.json({
        success: true,
        message: 'Tokens refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Clear all auth cookies
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.clearCookie('refresh-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current authenticated user
   */
  me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      // Get fresh user data from database
      const user = await authService.getUserById(req.user.id, req.user.companyCode);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user password
   */
  updatePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'New password must be at least 8 characters long',
        });
      }

      await authService.updatePassword(
        req.user.id,
        currentPassword,
        newPassword,
        req.user.companyCode
      );

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get users by role (Admin only)
   */
  getUsersByRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      // Only admins can list users
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const role = req.params.role as UserRole;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid role specified',
        });
      }

      const users = await authService.getUsersByRole(role, req.user.companyCode);

      res.json({
        success: true,
        data: {
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deactivate user account (Admin only)
   */
  deactivateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      // Only admins can deactivate users
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'User ID is required',
        });
      }

      // Prevent self-deactivation
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Cannot deactivate your own account',
        });
      }

      await authService.deactivateUser(userId, req.user.companyCode);

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();