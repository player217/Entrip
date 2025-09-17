import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const TOKEN_EXPIRY = 120; // 120초

export async function GET(req: NextRequest) {
  try {
    // HttpOnly 쿠키에서 인증 확인
    const authToken = cookies().get('auth-token');
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 백엔드에서 세션 검증
    const verifyResponse = await fetch(`${process.env.INTERNAL_API_URL || 'http://api:4000'}/api/auth/verify`, {
      headers: {
        'Cookie': `auth-token=${authToken.value}`
      }
    });

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = await verifyResponse.json();

    // WebSocket 전용 단기 토큰 생성
    const wsToken = jwt.sign(
      {
        userId: user.id,
        companyCode: user.companyCode,
        exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY
      },
      JWT_SECRET
    );

    return NextResponse.json({
      token: wsToken,
      expiresIn: TOKEN_EXPIRY
    });

  } catch (error) {
    console.error('WebSocket token generation failed:', error);
    return NextResponse.json(
      { error: 'Token generation failed' },
      { status: 500 }
    );
  }
}