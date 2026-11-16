/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';

describe('authenticated v2 proxy contract', () => {
  const originalFetch = global.fetch;
  const previous = process.env.INTERNAL_API_V2_URL;
  beforeEach(() => {
    process.env.INTERNAL_API_V2_URL = 'http://api-v2-test:4002';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }));
  });
  afterEach(() => { global.fetch = originalFetch; if (previous === undefined) delete process.env.INTERNAL_API_V2_URL; else process.env.INTERNAL_API_V2_URL = previous; });
  it('forwards cookie, authorization, query, and conditional version to v2', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/rooms/1?limit=10', { headers: { authorization: 'Bearer access', cookie: 'auth-token=session', 'if-match': '4' } });
    expect((await GET(req, { params: { path: ['rooms', '1'] } })).status).toBe(200);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe('http://api-v2-test:4002/api/v2/messages/rooms/1?limit=10');
    expect(options.headers.get('cookie')).toBe('auth-token=session');
    expect(options.headers.get('authorization')).toBe('Bearer access');
    expect(options.headers.get('if-match')).toBe('4');
  });
  it('preserves request bytes and upstream response status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('conflict', { status: 409 }));
    const req = new NextRequest('http://localhost/api/messages/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"text":"hello"}' });
    const response = await POST(req, { params: { path: ['rooms'] } });
    const options = (global.fetch as jest.Mock).mock.calls[0]![1];
    expect(new TextDecoder().decode(options.body)).toBe('{"text":"hello"}');
    expect(response.status).toBe(409);
    expect(await response.text()).toBe('conflict');
  });
  it('preserves empty 204 responses without inventing JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response(null, { status: 204 }));
    const response = await DELETE(new NextRequest('http://localhost/api/messages/42', { method: 'DELETE' }), { params: { path: ['42'] } });
    expect(response.status).toBe(204); expect(await response.text()).toBe('');
  });
  it('preserves both HttpOnly cookies and their original attributes', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'auth-token=access; Path=/; HttpOnly; SameSite=Lax');
    headers.append('set-cookie', 'refresh-token=refresh; Path=/; HttpOnly; Max-Age=604800');
    (global.fetch as jest.Mock).mockResolvedValue(new Response('{}', { headers }));
    const response = await GET(new NextRequest('http://localhost/api/messages/42'), { params: { path: ['42'] } });
    const cookies = response.headers.get('set-cookie') || '';
    expect(cookies).toContain('auth-token=access');
    expect(cookies).toContain('refresh-token=refresh');
    expect(cookies).toContain('HttpOnly');
    expect(cookies).toContain('Max-Age=604800');
  });
  it('reads runtime backend changes without rebuilding the route', async () => {
    process.env.INTERNAL_API_V2_URL = 'http://new-runtime:5000';
    await GET(new NextRequest('http://localhost/api/messages/42'), { params: { path: ['42'] } });
    expect((global.fetch as jest.Mock).mock.calls[0]![0]).toBe('http://new-runtime:5000/api/v2/messages/42');
  });
  it('reports API outage as 502, never unauthorized', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    const response = await GET(new NextRequest('http://localhost/api/messages/42'), { params: { path: ['42'] } });
    expect(response.status).toBe(502);
  });
});
