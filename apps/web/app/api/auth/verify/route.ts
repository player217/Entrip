import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001';

export async function GET(request: NextRequest) {
  try {
    // Get the auth-token cookie from the request
    const authToken = request.cookies.get('auth-token');
    
    // Forward the request to the actual API server with cookie
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward the cookie to the backend
        'Cookie': authToken ? `auth-token=${authToken.value}` : '',
      },
    });

    const data = await response.json();
    
    // Return the response from the API server
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Auth verify proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '인증 확인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}