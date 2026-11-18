/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

describe('/api/v2/team-bookings proxy contract', () => {
  const originalFetch = global.fetch;
  const originalApiV2 = process.env.INTERNAL_API_V2_URL;
  beforeEach(() => {
    process.env.INTERNAL_API_V2_URL = 'http://api-v2-test:4002';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiV2 === undefined) delete process.env.INTERNAL_API_V2_URL;
    else process.env.INTERNAL_API_V2_URL = originalApiV2;
  });
  it('forwards GET query and authenticated headers to v2 team-bookings', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings?page=1&pageSize=10', { headers: { authorization: 'Bearer t1', cookie: 'sid=s1', 'x-test-run-id': 'run-1' } });
    expect((await GET(req)).status).toBe(200);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe('http://api-v2-test:4002/api/v2/team-bookings?page=1&pageSize=10');
    expect(options.method).toBe('GET');
    expect(options.headers.get('authorization')).toBe('Bearer t1');
    expect(options.headers.get('cookie')).toBe('sid=s1');
    expect(options.headers.get('x-test-run-id')).toBe('run-1');
  });
  it('forwards exact POST body bytes and created status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('{"id":"created"}', { status: 201 }));
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ teamName: 'Alpha Team' }) });
    const response = await POST(req);
    expect(response.status).toBe(201);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0]!;
    expect(url).toBe('http://api-v2-test:4002/api/v2/team-bookings');
    expect(options.method).toBe('POST');
    expect(new TextDecoder().decode(options.body)).toBe(JSON.stringify({ teamName: 'Alpha Team' }));
    expect(await response.json()).toEqual({ id: 'created' });
  });
});
