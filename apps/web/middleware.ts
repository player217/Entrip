// apps/web/middleware.ts - D2.1: Enhanced Authentication Middleware
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/api/exchange', '/api/health', '/api/v2', '/_next/static', '/_next/image', '/favicon.ico']

/**
 * D2.1: Enhanced Token Validation
 * Validates JWT tokens server-side for improved security
 */
async function validateToken(token: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // D2.1: Server-side token validation via API v2
    // Prefer v2 internal URL; fall back to v1 var for legacy setups
    const baseUrl = process.env.INTERNAL_API_V2_URL
      || process.env.API_V2_URL
      || process.env.INTERNAL_API_URL
      || 'http://api-v2:4000';
    const response = await fetch(`${baseUrl}/api/v2/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return { 
        isValid: false, 
        error: `Token validation failed: ${response.status}` 
      }
    }

    const data = await response.json()
    return { 
      isValid: data.success === true,
      error: data.success ? undefined : data.message 
    }
  } catch (error) {
    console.error('[D2.1] Token validation error:', error)
    return { 
      isValid: false, 
      error: 'Token validation service unavailable' 
    }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // D2.1: Enhanced authentication checks
  const token = request.cookies.get('auth-token')?.value
  
  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // D2.1: Validate token integrity and expiration
  const validation = await validateToken(token)
  
  if (!validation.isValid) {
    console.warn(`[D2.1] Token validation failed for ${pathname}:`, validation.error)
    
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }

  // Token is valid, allow access
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
