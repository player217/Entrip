import { NextRequest } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function handler(request: NextRequest, { params }: { params: { proxy: string[] } }) {
  return proxyApiV2(request, '' + (params.proxy || []).join('/'));
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as HEAD, handler as OPTIONS };
