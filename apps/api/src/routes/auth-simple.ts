import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { LoginRequest, LoginResponse, JWTPayload, User, mapPrismaUserToShared, mapPrismaRoleToShared } from '@entrip/shared';
import { authRateLimiter } from '../middleware/security.middleware';
import prisma from '../lib/prisma';

const router: ExpressRouter = Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Verify password using bcrypt
const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Helper: accept common aliases and case-insensitive company codes
function resolveCompanyCandidates(input: string): string[] {
  if (!input) return [];
  const cc = input.trim();
  const lc = cc.toLowerCase();
  const set = new Set<string>();

  // Always include raw forms
  set.add(cc);
  set.add(cc.toUpperCase());
  set.add(lc);

  // Canonical alias mapping (accept legacy UI labels)
  switch (lc) {
    case 'entrip':
    case 'entrip_main':
    case 'entrip-main':
    case 'main':
      set.add('ENTRIP_MAIN');
      break;
    case 'startour':
      // Historical label maps to 'star' in DB
      set.add('star');
      set.add('STAR');
      break;
    case 'happytravel':
      // Historical label maps to 'happy' in DB
      set.add('happy');
      set.add('HAPPY');
      break;
    case 'j1':
      set.add('J1');
      break;
    default:
      // no-op, raw values already included
      break;
  }

  return Array.from(set);
}

// Login endpoint with real database authentication
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { companyCode, username, password }: LoginRequest = req.body;
    
    // Validate input
    if (!companyCode || !username || !password) {
      return res.status(400).json({ 
        success: false,
        message: '회사코드, 아이디, 비밀번호를 모두 입력해주세요.' 
      });
    }

    console.log('Auth attempt:', { companyCode, username });
    
    // Find user in database (using email as username)
    console.log('DEBUG: About to query with:', { companyCode, email: username, isActive: true });

    // Accept synonyms for company codes to avoid UI/seed mismatches
    const candidates = resolveCompanyCandidates(companyCode);

    const user = await prisma.user.findFirst({
      where: {
        email: username,
        isActive: true,
        companyCode: { in: candidates },
      },
    });
    
    if (!user) {
      console.log('User not found:', { companyCode, username });
      return res.status(401).json({ 
        success: false,
        message: '존재하지 않거나 비활성화된 계정입니다.' 
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ 
        success: false,
        message: '잘못된 비밀번호입니다.' 
      });
    }

    // Create JWT token
    const payload: JWTPayload = {
      userId: user.id,
      companyCode: user.companyCode,
      username: user.email, // use email as username
      role: mapPrismaRoleToShared(user.role)
    };

    const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    const token = jwt.sign(payload as object, JWT_SECRET, signOptions);

    // Update last login time (User model doesn't have lastLoginAt field, skip for now)

    // Prepare user response (exclude sensitive data)
    const userResponse: User = {
      id: user.id,
      companyCode: user.companyCode,
      username: user.email, // use email as username
      email: user.email,
      name: user.name,
      role: mapPrismaRoleToShared(user.role),
      department: user.department || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // Set HttpOnly cookie for SSOT authentication
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Success response
    const response: LoginResponse = {
      success: true,
      token: undefined,
      user: userResponse,
      message: '로그인 성공'
    };

    console.log('Login successful:', { userId: user.id, companyCode: user.companyCode });
    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authRateLimiter, async (req, res) => {
  try {
    // Check for token in HttpOnly cookie
    const token = req.cookies?.['auth-token'];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: '토큰이 제공되지 않았습니다.' 
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      
      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          success: false,
          message: '유효하지 않은 사용자입니다.' 
        });
      }
      
      // Generate new token with extended expiry
      const newPayload: JWTPayload = {
        userId: decoded.userId,
        companyCode: decoded.companyCode,
        username: decoded.username,
        role: decoded.role
      };
      
      const signOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
      const newToken = jwt.sign(newPayload as object, JWT_SECRET, signOptions);
      
      // Set new HttpOnly cookie
      res.cookie('auth-token', newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
      });
      
      res.json({ success: true, message: '토큰이 갱신되었습니다.' });
    } catch (error) {
      return res.status(401).json({ 
        success: false,
        message: '토큰이 만료되었거나 유효하지 않습니다.' 
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// Token verification endpoint with real database
router.get('/verify', async (req, res) => {
  try {
    // Check for token in HttpOnly cookie first (SSOT), then fallback to Authorization header
    const token = req.cookies?.['auth-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: '토큰이 제공되지 않았습니다.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: '유효하지 않은 사용자입니다.' 
      });
    }

    // Prepare user response
    const userResponse: User = {
      id: user.id,
      companyCode: user.companyCode,
      username: user.email, // use email as username
      email: user.email,
      name: user.name,
      role: mapPrismaRoleToShared(user.role),
      department: user.department || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.createdAt.toISOString() // Use createdAt since lastLoginAt doesn't exist
    };

    res.json({ 
      success: true,
      user: userResponse 
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      success: false,
      message: '유효하지 않은 토큰입니다.' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Clear HttpOnly cookie for SSOT authentication
  res.clearCookie('auth-token', {
    httpOnly: true,
    secure: false, // Set to false for local development
    sameSite: 'lax', // Changed from 'strict' to 'lax' for local development
    path: '/' // Ensure cookie is cleared from all paths
  });
  
  res.json({ 
    success: true,
    message: '로그아웃 성공' 
  });
});

export default router;
