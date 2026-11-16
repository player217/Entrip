import { NextRequest, NextResponse } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyApiV2(request, 'auth/login', JSON.stringify({ ...body, email: body.email || body.username }));
  } catch {
    return NextResponse.json({ success: false, message: '잘못된 로그인 요청입니다.' }, { status: 400 });
  }
}
