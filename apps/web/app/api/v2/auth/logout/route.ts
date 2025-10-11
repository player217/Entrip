import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

const API_V2 = process.env.API_V2_URL || 'http://api-v2:4000';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const response = await fetch(`${API_V2}/api/v2/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
    });
    const next = NextResponse.json({ success: response.ok }, { status: response.status });
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
    console.error('[V2 Auth Logout Proxy] error:', error);
    return NextResponse.json({ success: false, message: 'v2 로그아웃 실패' }, { status: 500 });
  }
}
