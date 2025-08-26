import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '@entrip/shared';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for token in HttpOnly cookie first (SSOT), then fallback to Authorization header
    const token = req.cookies?.['auth-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: '인증 토큰이 필요합니다.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: '유효하지 않은 토큰입니다.' 
    });
  }
};

// Alias for compatibility
export const authMiddleware = authenticate;

// Role-based authorization middleware
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: '인증이 필요합니다.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: '접근 권한이 없습니다.' 
      });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole([UserRole.ADMIN]);

// Manager or Admin middleware  
export const requireManager = requireRole([UserRole.ADMIN, UserRole.MANAGER]);