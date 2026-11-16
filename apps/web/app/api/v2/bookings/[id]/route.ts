import { NextRequest } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: { id: string } };
export const GET = (request: NextRequest, { params }: Context) => proxyApiV2(request, `bookings/${encodeURIComponent(params.id)}`);
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
