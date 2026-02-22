import { NextRequest, NextResponse } from 'next/server';

const API_V2_URL = process.env.INTERNAL_API_V2_URL || 'http://api-v2:4000';

function isLegacyCompatibilityPath(path: string): boolean {
  return path.startsWith('/api/bookings');
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const path = params.path?.join('/') ?? '';
  const legacyPath = `/api/bookings/${path}`.replace(/\/+$/, '');
  const targetPath = isLegacyCompatibilityPath(legacyPath)
    ? `/api/v2/bookings/${path}`.replace(/\/+$/, '')
    : '/api/v2/bookings';
  const target = `${API_V2_URL}${targetPath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.set('host', new URL(API_V2_URL).host);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    // @ts-expect-error Next.js fetch extension
    duplex: 'half',
  });

  const body = await response.text();
  const next = new NextResponse(body, { status: response.status, statusText: response.statusText });
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') next.headers.set(key, value);
  });
  return next;
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
export async function PATCH(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
