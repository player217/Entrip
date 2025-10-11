/**
 * Proxy for packages/api (v2) endpoints
 * 
 * This handles all /api/v2/* requests and forwards them to the packages/api service
 */

import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime so we can forward cookies/headers reliably
export const runtime = 'nodejs';

// Get the API URL based on environment
const getApiUrl = () => {
  // Use environment variable first, then fallback to defaults
  if (process.env.INTERNAL_API_V2_URL) {
    return process.env.INTERNAL_API_V2_URL;
  }

  // In Docker environment, use Docker service name
  if (typeof window === 'undefined') {
    // Server-side: use Docker network name
    return 'http://api-v2:4000'; // Docker internal port is 4000
  }

  // Client-side or development
  return 'http://localhost:4002';
};

// Handler for all HTTP methods
async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const apiUrl = getApiUrl();
  const path = params.path?.join('/') || '';
  // Forward to API v2 with correct /api/v2 prefix
  const url = `${apiUrl}/api/v2/${path}${request.nextUrl.search}`;

  console.log('[V2 Proxy Debug]', {
    INTERNAL_API_V2_URL: process.env.INTERNAL_API_V2_URL,
    apiUrl,
    targetUrl: url,
    method: request.method,
  });

  try {
    // Convert headers to plain object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Forward the request to the API
    const response = await fetch(url, {
      method: request.method,
      headers: {
        ...headers,
        // Remove Next.js specific headers
        host: new URL(apiUrl).host,
      },
      body: request.body ? await request.text() : undefined,
      // @ts-ignore - Next.js specific
      duplex: 'half',
    });

    // Read upstream response body as text (may be JSON)
    const data = await response.text();

    // Create NextResponse and forward headers safely
    const next = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy non Set-Cookie headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') {
        next.headers.set(key, value);
      }
    });

    // Preserve multiple Set-Cookie headers (undici/Next provides getSetCookie on headers)
    // Fallback: if not available, append the single header value
    const anyHeaders: any = response.headers as any;
    const setCookies: string[] = anyHeaders.getSetCookie?.() ?? [];
    if (Array.isArray(setCookies) && setCookies.length > 0) {
      for (const cookie of setCookies) {
        next.headers.append('set-cookie', cookie);
      }
    } else {
      const sc = response.headers.get('set-cookie');
      if (sc) next.headers.append('set-cookie', sc);
    }

    // Ensure Content-Type is present
    if (!next.headers.has('content-type')) {
      const ct = response.headers.get('content-type') || 'application/json';
      next.headers.set('content-type', ct);
    }

    return next;
  } catch (error) {
    console.error('[API v2 Proxy] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to connect to API v2',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
