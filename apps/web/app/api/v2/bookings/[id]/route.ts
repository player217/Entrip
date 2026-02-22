import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

function apiV2Base() {
  return process.env.API_V2_URL || 'http://api-v2:4000';
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = `${apiV2Base()}/api/v2/bookings/${params.id}`;
    const cookieHeader = request.headers.get('cookie') || '';
    const response = await fetch(url, { 
      method: 'GET', 
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
      },
      signal: AbortSignal.timeout(10000) 
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream error', status: response.status, detail: text }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[V2 Bookings Proxy][GET detail] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch v2 booking' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const url = `${apiV2Base()}/api/v2/bookings/${params.id}`;
    const ifMatch = request.headers.get('if-match') || request.headers.get('If-Match') || undefined;
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
        ...(ifMatch ? { 'If-Match': ifMatch } : {}),
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
    console.error('[V2 Bookings Proxy][PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update v2 booking' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = `${apiV2Base()}/api/v2/bookings/${params.id}`;
    const ifMatch = request.headers.get('if-match') || request.headers.get('If-Match') || undefined;
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
        ...(ifMatch ? { 'If-Match': ifMatch } : {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: 'Upstream error', status: response.status, detail: text }, { status: response.status });
    }
    // No body expected
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[V2 Bookings Proxy][DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete v2 booking' }, { status: 500 });
  }
}
