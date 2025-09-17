import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService, AuthTokenPayload } from '../routes/auth/auth.service';
import { ApiError } from './error.middleware';

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
  companyCode?: string;
}

/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in HttpOnly cookie first (SSOT), then fallback to Authorization header
    let token = req.cookies?.['auth-token'];

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access token is required',
      });
    }

    // Verify token and get user payload
    const payload = await authService.verifyAccessToken(token);

    // Attach user payload to request
    req.user = payload;
    req.companyCode = payload.companyCode;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Role-based access control middleware
 * Requires user to have one of the specified roles
 */
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Admin-only access middleware
 */
export const requireAdmin = requireRole([UserRole.ADMIN]);

/**
 * Manager or Admin access middleware
 */
export const requireManagerOrAdmin = requireRole([UserRole.ADMIN, UserRole.MANAGER]);

/**
 * Company isolation middleware
 * Ensures user can only access resources within their company
 */
export const requireCompanyAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  // Extract companyCode from request params, query, or body
  const companyCode = req.params.companyCode || req.query.companyCode || req.body.companyCode;

  if (companyCode && companyCode !== req.user.companyCode) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Access denied to resources outside your company',
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require authentication
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = req.cookies?.['auth-token'];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      try {
        const payload = await authService.verifyAccessToken(token);
        req.user = payload;
        req.companyCode = payload.companyCode;
      } catch {
        // Token is invalid, but continue without authentication
        req.user = undefined;
        req.companyCode = undefined;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication on any error
    req.user = undefined;
    next();
  }
};