import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Reject development diagnostics before streaming starts so production returns HTTP 404.
  const pathname = request.nextUrl.pathname;
  if (process.env.NODE_ENV === 'production' && (pathname === '/icon-test' || pathname.startsWith('/icon-test/'))) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  // API authorization is enforced by the API itself. Page data is verified by MainLayout.
  // Avoid a second server check on every asset/navigation, which exhausted login budgets.
  if (!request.cookies.get('auth-token')?.value) {
    // Next may reconstruct request.url with its container address. Use the
    // gateway's external Host only after matching a launch-time allowed origin.
    let base = request.url;
    if (process.env.NEXT_PUBLIC_ENTRIP_LAN === 'true') {
      const origin = `http://${request.headers.get('host')}`;
      const allowed = (process.env.ENTRIP_LAN_ORIGINS || '').split(',').map(value => value.trim());
      if (!allowed.includes(origin)) return new NextResponse('Unknown server address', { status: 400 });
      base = origin;
    }
    const login = new URL('/login', base);
    login.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!api|_next|favicon.ico|login|public|.*\\..*).*)'] };
