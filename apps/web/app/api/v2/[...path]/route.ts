/**
 * Proxy for packages/api (v2) endpoints
 * 
 * This handles all /api/v2/* requests and forwards them to the packages/api service
 */

import { NextRequest, NextResponse } from 'next/server';

// Get the API URL based on environment
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.INTERNAL_API_V2_URL || 'http://api-v2:4002';
  }
  return 'http://localhost:4002';
};

// Handler for all HTTP methods
async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const apiUrl = getApiUrl();
  const path = params.path?.join('/') || '';
  const url = `${apiUrl}/api/v2/${path}${request.nextUrl.search}`;

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

    // Forward the response
    const data = await response.text();
    
    const responseHeaders: Record<string, string> = {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    };

    // Forward any cookies from the API
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders[key] = value;
      }
    });
    
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
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
