import { NextRequest } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: NextRequest) => proxyApiV2(request, 'bookings');
export const POST = (request: NextRequest) => proxyApiV2(request, 'bookings');
