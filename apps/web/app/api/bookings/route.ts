import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Docker 내부에서는 service name으로 접근, 개발 환경에서는 localhost
    const apiUrl = process.env.INTERNAL_API_URL || 'http://api:4000';
    const url = `${apiUrl}/api/bookings${queryString ? `?${queryString}` : ''}`;
    
    console.log('[Bookings API Proxy] Requesting:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
      // timeout 설정
      signal: AbortSignal.timeout(10000), // 10초 타임아웃
    });
    
    if (!response.ok) {
      console.error('[Bookings API Proxy] Response not OK:', response.status, response.statusText);
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Bookings API Proxy] Success:', data?.data?.length || 0, 'bookings');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Bookings API Proxy Error]:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = process.env.INTERNAL_API_URL || 'http://api:4000';
    const url = `${apiUrl}/api/bookings`;
    
    console.log('[Bookings API Proxy] POST Request:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.error('[Bookings API Proxy] POST Response not OK:', response.status);
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[Bookings API Proxy] POST Success:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Bookings API Proxy POST Error]:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}