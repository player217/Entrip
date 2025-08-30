// apps/web/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/_next/static', '/_next/image', '/favicon.ico']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check for auth token in HttpOnly cookie
  const token = request.cookies.get('auth-token')?.value
  
  // If no token, redirect to login (SINGLE SOURCE OF REDIRECTS)
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token exists, allow access
  // Note: Full token validation happens in API middleware for security
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (Next.js internal files)
     * - favicon.ico (favicon file)
     * - api/auth (authentication endpoints only)
     * - login (login page)
     * - public (public assets)
     */
    '/((?!_next|favicon.ico|api/auth|login|public).*)',
  ],
}
