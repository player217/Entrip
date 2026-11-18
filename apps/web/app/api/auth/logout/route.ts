import { NextRequest } from 'next/server';
import { proxyApiV2 } from '@/lib/server/api-v2-proxy';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const response = await proxyApiV2(request, 'auth/logout');
  // Local HttpOnly cookies must be removed even during an upstream outage.
  response.cookies.delete('auth-token');
  response.cookies.delete('refresh-token');
  return response;
}
