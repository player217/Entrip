// D2.1: Enhanced Authentication Middleware with Security Hardening
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '@entrip/shared';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// D2.1: Enhanced token validation with security checks
interface TokenValidationResult {
  isValid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * D2.1: Enhanced token validation with comprehensive security checks
 */
function validateTokenSecurity(token: string, payload: JWTPayload): TokenValidationResult {
  // D2.1: Check token format and structure
  if (!token || typeof token !== 'string' || token.length < 50) {
    return { isValid: false, error: 'Invalid token format' };
  }

  // D2.1: Validate required payload fields
  if (!payload.userId || !payload.username || !payload.role) {
    return { isValid: false, error: 'Invalid token payload structure' };
  }

  // D2.1: Check token expiration with buffer
  const now = Math.floor(Date.now() / 1000);
  const bufferTime = 60; // 1 minute buffer for clock skew
  
  if (payload.exp && payload.exp < (now + bufferTime)) {
    return { isValid: false, error: 'Token expired' };
  }

  // D2.1: Validate token issued time (not future dated)
  if (payload.iat && payload.iat > (now + bufferTime)) {
    return { isValid: false, error: 'Token issued in future' };
  }

  // D2.1: Additional security validations
  if (payload.companyCode && payload.companyCode.length < 2) {
    return { isValid: false, error: 'Invalid company context' };
  }

  return { isValid: true, payload };
}

// D2.1: Enhanced Authentication middleware
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

    // D2.1: Enhanced JWT verification with stronger options
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Only allow expected algorithm
      maxAge: '24h',         // Maximum token age
      clockTolerance: 60     // 60 seconds clock tolerance
    }) as JWTPayload;

    // D2.1: Additional security validation
    const validation = validateTokenSecurity(token, decoded);
    if (!validation.isValid) {
      console.warn('[D2.1] Token security validation failed:', validation.error);
      return res.status(401).json({ 
        success: false,
        message: '토큰 보안 검증에 실패했습니다.' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    let errorMessage = '유효하지 않은 토큰입니다.';
    
    // D2.1: Enhanced error handling with specific messages
    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = '토큰이 만료되었습니다. 다시 로그인해주세요.';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = '토큰 형식이 올바르지 않습니다.';
    } else if (error instanceof jwt.NotBeforeError) {
      errorMessage = '토큰이 아직 활성화되지 않았습니다.';
    }

    console.warn('[D2.1] Authentication failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    return res.status(401).json({ 
      success: false,
      message: errorMessage 
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