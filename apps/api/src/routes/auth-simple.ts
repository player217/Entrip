import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { LoginRequest, LoginResponse, JWTPayload, User, Company } from '@entrip/shared';

const router: ExpressRouter = Router();

// JWT Secret - in production this should be from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Load mock data
const loadMockData = () => {
  const dataPath = path.join(__dirname, '../data/mock-users.json');
  try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to load mock data:', error);
    return { companies: [], users: [] };
  }
};

// Hash password utility (for reference - actual hashing would be done during user creation)
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  // For demo purposes, we'll accept 'pass1234' for all accounts
  // In real implementation, use bcrypt.compare(password, hashedPassword)
  return password === 'pass1234';
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { companyCode, username, password }: LoginRequest = req.body;
    
    // Validate input
    if (!companyCode || !username || !password) {
      return res.status(400).json({ 
        success: false,
        message: '회사코드, 아이디, 비밀번호를 모두 입력해주세요.' 
      });
    }

    const mockData = loadMockData();
    
    // Find company
    const company = mockData.companies.find((c: Company) => c.code === companyCode);
    if (!company || !company.isActive) {
      return res.status(401).json({ 
        success: false,
        message: '존재하지 않거나 비활성화된 회사코드입니다.' 
      });
    }

    // Find user
    const user = mockData.users.find((u: any) => 
      u.companyCode === companyCode && u.username === username
    );
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: '존재하지 않거나 비활성화된 계정입니다.' 
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: '잘못된 비밀번호입니다.' 
      });
    }

    // Create JWT token
    const payload: JWTPayload = {
      userId: user.id,
      companyCode: user.companyCode,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN as string });

    // Update last login time (in real app, this would update the database)
    user.lastLoginAt = new Date().toISOString();

    // Prepare user response (exclude sensitive data)
    const userResponse: User = {
      id: user.id,
      companyCode: user.companyCode,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    // Set HttpOnly cookie for SSOT authentication
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: false, // Set to false for local development
      sameSite: 'lax', // Changed from 'strict' to 'lax' for local development
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/' // Ensure cookie is available for all paths
    });

    // Don't send token in response for security - only use HttpOnly cookie
    const response: LoginResponse = {
      success: true,
      token: undefined, // Don't expose token to client
      user: userResponse,
      message: '로그인 성공'
    };

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// Token refresh endpoint
router.post('/refresh', (req, res) => {
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
      
      // Generate new token with extended expiry
      const newPayload: JWTPayload = {
        userId: decoded.userId,
        companyCode: decoded.companyCode,
        username: decoded.username,
        role: decoded.role,
        iat: Math.floor(Date.now() / 1000)
      };
      
      const newToken = jwt.sign(newPayload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN as string });
      
      // Set new HttpOnly cookie
      res.cookie('auth-token', newToken, {
        httpOnly: true,
        secure: false, // Set to false for local development
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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

// Token verification endpoint
router.get('/verify', (req, res) => {
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
    const mockData = loadMockData();
    
    // Find user
    const user = mockData.users.find((u: any) => 
      u.id === decoded.userId && u.companyCode === decoded.companyCode
    );

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
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
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