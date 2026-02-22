import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// API 버전별 URL 설정
const API_V1_URL = process.env.INTERNAL_API_URL || 'http://api:4000';
const API_V2_URL = process.env.API_V2_URL || 'http://api-v2:4005';

// 마이그레이션 단계 (환경 변수로 제어)
const MIGRATION_PHASE = parseInt(process.env.API_MIGRATION_PHASE || '0', 10);

// 라우트별 v2 전환 설정
const V2_ROUTES = {
  // Phase 1: 읽기 전용 엔드포인트
  phase1: new Set([
    'bookings',      // GET /bookings
    'calendar',      // GET /calendar
    'users',         // GET /users
    'finance',       // GET /finance
  ]),

  // Phase 2: 인증 엔드포인트
  phase2: new Set([
    'auth/verify',
    'auth/refresh',
    'auth/logout',
  ]),

  // Phase 3: 쓰기 작업
  phase3: new Set([
    'auth/login',    // POST /auth/login
    'bookings',      // POST/PUT/DELETE /bookings
    'calendar',      // POST/PUT/DELETE /calendar
  ])
};

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
  'x-rate-limit-reset',
  'x-api-version'
];

/**
 * 라우트가 v2로 전환되어야 하는지 판단
 */
function shouldUseV2(path: string[], method: string): boolean {
  // 마이그레이션 비활성화 상태
  if (MIGRATION_PHASE === 0) {
    return false;
  }

  const route = path.join('/');
  const primaryRoute = path[0] || '';

  // Phase 1: 읽기 전용
  if (MIGRATION_PHASE >= 1) {
    if (method === 'GET' && primaryRoute && V2_ROUTES.phase1.has(primaryRoute)) {
      console.log(`[Strangler] Routing GET ${route} to v2`);
      return true;
    }
  }

  // Phase 2: 인증
  if (MIGRATION_PHASE >= 2) {
    if (V2_ROUTES.phase2.has(route)) {
      console.log(`[Strangler] Routing ${method} ${route} to v2`);
      return true;
    }
  }

  // Phase 3: 모든 쓰기 작업
  if (MIGRATION_PHASE >= 3) {
    if (V2_ROUTES.phase3.has(route) || (primaryRoute && V2_ROUTES.phase3.has(primaryRoute))) {
      console.log(`[Strangler] Routing ${method} ${route} to v2`);
      return true;
    }
  }

  return false;
}

async function proxyHandler(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname.replace('/api', '');
    const pathSegments = pathname.split('/').filter(Boolean);

    // v1 또는 v2 선택
    const useV2 = shouldUseV2(pathSegments, req.method);
    const apiBaseUrl = useV2 ? API_V2_URL : API_V1_URL;
    const apiVersion = useV2 ? 'v2' : 'v1';

    // 대상 URL 구성
    const targetUrl = `${apiBaseUrl}/api${pathname}${req.nextUrl.search}`;

    console.log(`[Strangler] Proxying ${req.method} ${pathname} to ${apiVersion}: ${targetUrl}`);

    // 헤더 정리
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (!FORBIDDEN_HEADERS.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // API 버전 헤더 추가
    headers.set('x-api-version', apiVersion);

    // 쿠키 처리
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    // 바디 처리
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
      duplex: 'half'
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

    // 실제 사용된 API 버전 표시
    responseHeaders.set('x-proxied-api-version', apiVersion);

    // Set-Cookie 처리
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length > 0) {
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
        // JSON 파싱 실패시 원본 반환
      }
    }

    return NextResponse.json(responseBody, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('[Strangler] Proxy error:', error);

    return NextResponse.json(
      {
        error: 'Internal proxy error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const PATCH = proxyHandler;
export const DELETE = proxyHandler;