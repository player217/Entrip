import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.INTERNAL_API_URL || 'http://api:4000';

// 금지된 헤더 목록
const FORBIDDEN_HEADERS = [
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'te',
  'trailer'
];

// 응답 헤더 화이트리스트
const ALLOWED_RESPONSE_HEADERS = [
  'content-type',
  'cache-control',
  'etag',
  'last-modified',
  'x-request-id',
  'x-rate-limit-remaining',
  'x-rate-limit-reset'
];

async function proxyHandler(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname.replace('/api', '');
    const targetUrl = `${API_BASE_URL}/api${pathname}${req.nextUrl.search}`;

    // 헤더 정리
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (!FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // 쿠키 처리 (중복 방지)
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    // 바디 처리 (GET/HEAD는 body 없음)
    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        body = JSON.stringify(await req.json());
      } else if (contentType?.includes('multipart/form-data')) {
        body = await req.formData();
      } else {
        body = await req.text();
      }
    }

    // 백엔드 요청
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      // @ts-ignore - Next.js specific
      duplex: 'half' // Stream 지원
    });

    // 응답 처리
    const responseData = await response.text();
    
    // 응답 헤더 필터링
    const responseHeaders = new Headers();
    ALLOWED_RESPONSE_HEADERS.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Set-Cookie 특별 처리
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) {
      // Next.js cookies() API로 쿠키 설정
      setCookies.forEach(cookie => {
        const [nameValue, ...attributes] = cookie.split(';');
        const [name, value] = nameValue?.split('=') || ['', ''];
        
        if (name && value) {
          cookieStore.set({
            name: name.trim(),
            value: value.trim(),
          httpOnly: true,
          sameSite: 'lax',
          path: '/'
          });
        }
      });
    }

    // JSON 응답 처리
    let responseBody: any = responseData;
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        responseBody = JSON.parse(responseData);
      } catch {
        // JSON 파싱 실패시 원본 텍스트 반환
      }
    }

    return NextResponse.json(responseBody, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Proxy error:', error);
    
    return NextResponse.json(
      { error: 'Internal proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;