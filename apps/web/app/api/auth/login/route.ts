import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the actual API server
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    // Create response with the API data
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    // Forward Set-Cookie headers from the backend API to the browser
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      // Parse and forward the cookie
      nextResponse.headers.set('Set-Cookie', setCookieHeader);
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}