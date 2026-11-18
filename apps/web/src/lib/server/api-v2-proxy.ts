import { NextRequest, NextResponse } from 'next/server';

/** Resolve on each request so a promoted build uses its runtime API settings. */
export function getApiV2BaseUrl(): string {
  return (process.env.INTERNAL_API_V2_URL || process.env.API_V2_URL || 'http://localhost:4002')
    .replace(/\/+$/, '').replace(/\/api\/v2$/, '');
}

const hopHeaders = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'keep-alive', 'upgrade', 'te', 'trailer']);

export async function proxyApiV2(request: NextRequest, path: string, body?: string): Promise<NextResponse> {
  const endpoint = path.replace(/^\/?api\/v2\//, '').replace(/^\//, '');
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!hopHeaders.has(key.toLowerCase())) headers.set(key, value);
  });
  try {
    const response = await fetch(`${getApiV2BaseUrl()}/api/v2/${endpoint}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body ?? await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
    const empty = request.method === 'HEAD' || [204, 205, 304].includes(response.status);
    const result = new NextResponse(empty ? null : await response.arrayBuffer(), { status: response.status });
    response.headers.forEach((value, key) => {
      if (!hopHeaders.has(key.toLowerCase()) && !['set-cookie', 'content-encoding'].includes(key.toLowerCase())) {
        result.headers.set(key, value);
      }
    });
    const upstreamHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = upstreamHeaders.getSetCookie?.() ?? [];
    if (cookies.length) cookies.forEach(cookie => result.headers.append('set-cookie', cookie));
    else if (response.headers.get('set-cookie')) result.headers.append('set-cookie', response.headers.get('set-cookie')!);
    result.headers.set('cache-control', 'no-store');
    return result;
  } catch {
    return NextResponse.json({ success: false, message: 'API 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}
