import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001';

export async function POST(request: NextRequest) {
  try {
    // Get the auth-token cookie from the request
    const authToken = request.cookies.get('auth-token');
    
    // Forward the request to the actual API server with cookie
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the cookie to the backend
        'Cookie': authToken ? `auth-token=${authToken.value}` : '',
      },
    });

    const data = await response.json();
    
    // Create response with the API data
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    // Forward Set-Cookie headers from the backend API to clear the cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Logout proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '로그아웃 처리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}