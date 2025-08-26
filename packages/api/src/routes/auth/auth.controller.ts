import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { RegisterInput } from './dtos/Register.dto';
import { LoginInput } from './dtos/Login.dto';

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: RegisterInput = req.body;
      const user = await authService.register(input);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      // Set auth token as HttpOnly cookie (SSOT)
      res.cookie('auth-token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' for better compatibility
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Ensure cookie is available for all paths
      });

      // Also set refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Don't send token in response for security
      res.json({
        success: true,
        data: {
          user: result.user,
          // accessToken is not sent to client (using HttpOnly cookie)
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required',
        });
      }

      const tokens = await authService.refreshTokens(refreshToken);

      // Update refresh token cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Clear both cookies for complete logout
      res.clearCookie('auth-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.clearCookie('refreshToken', {
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

  // Protected route example - get current user
  me = async (req: Request & { user?: { id: string; email: string; role: string } }, res: Response, next: NextFunction) => {
    try {
      res.json({
        success: true,
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();