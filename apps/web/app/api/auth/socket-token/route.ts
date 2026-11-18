import { NextRequest } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) { return proxyApiV2(request, 'auth/socket-token'); }
