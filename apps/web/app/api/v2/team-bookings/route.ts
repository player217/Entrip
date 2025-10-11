import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

function apiV2Base() {
  return process.env.API_V2_URL || 'http://api-v2:4000';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${apiV2Base()}/api/v2/team-bookings${queryString ? `?${queryString}` : ''}`;

    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream error', status: response.status, detail: text }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[V2 TeamBookings Proxy][GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch v2 team bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = `${apiV2Base()}/api/v2/team-bookings`;
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream error', status: response.status, detail: text }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[V2 TeamBookings Proxy][POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create v2 team booking' }, { status: 500 });
  }
}
