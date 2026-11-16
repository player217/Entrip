import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // API authorization is enforced by the API itself. Page data is verified by MainLayout.
  // Avoid a second server check on every asset/navigation, which exhausted login budgets.
  if (!request.cookies.get('auth-token')?.value) {
    const login = new URL('/login', request.url);
    login.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!api|_next|favicon.ico|login|public|.*\\..*).*)'] };
