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

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
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
      // Clear refresh token cookie
      res.clearCookie('refreshToken');

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