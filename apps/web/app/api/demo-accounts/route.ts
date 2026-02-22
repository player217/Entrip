import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/api/demo-accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
      },
      // keep short timeout
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[DemoAccounts API Proxy Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load demo accounts' },
      { status: 500 }
    );
  }
}

