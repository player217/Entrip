import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

const API_V2 = process.env.API_V2_URL || 'http://api-v2:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_V2}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Run-Id': request.headers.get('x-test-run-id') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    const next = NextResponse.json(data, { status: response.status });
    // Preserve multiple Set-Cookie headers
    const anyHeaders: any = response.headers as any;
    const setCookies: string[] = anyHeaders.getSetCookie?.() ?? [];
    if (Array.isArray(setCookies) && setCookies.length > 0) {
      for (const cookie of setCookies) next.headers.append('set-cookie', cookie);
    } else {
      const sc = response.headers.get('set-cookie');
      if (sc) next.headers.append('set-cookie', sc);
    }
    return next;
  } catch (error) {
    console.error('[V2 Auth Login Proxy] error:', error);
    return NextResponse.json({ success: false, message: 'v2 로그인 실패' }, { status: 500 });
  }
}
