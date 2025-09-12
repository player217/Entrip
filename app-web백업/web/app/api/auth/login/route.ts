import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001';

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
    
    // Return the response from the API server
    return NextResponse.json(data, { status: response.status });
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