/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

describe('/api/v2/team-bookings/[id] proxy contract', () => {
  const originalFetch = global.fetch;
  const originalApiV2 = process.env.INTERNAL_API_V2_URL;
  beforeEach(() => {
    process.env.INTERNAL_API_V2_URL = 'http://api-v2-test:4002';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, id: 'tb-1' }), { status: 200, headers: { 'content-type': 'application/json', etag: 'W/"3"' } }));
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiV2 === undefined) delete process.env.INTERNAL_API_V2_URL;
    else process.env.INTERNAL_API_V2_URL = originalApiV2;
  });
  it('forwards detail GET and the upstream ETag', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1'), { params: { id: 'tb-1' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('W/"3"');
    expect((global.fetch as jest.Mock).mock.calls[0]![0]).toBe('http://api-v2-test:4002/api/v2/team-bookings/tb-1');
  });
  it('forwards PUT with If-Match and exact body bytes', async () => {
    const request = new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer t2', cookie: 'sid=s2', 'if-match': '3' }, body: JSON.stringify({ teamName: 'Updated Team' }) });
    expect((await PUT(request, { params: { id: 'tb-1' } })).status).toBe(200);
    const options = (global.fetch as jest.Mock).mock.calls[0]![1];
    expect(options.method).toBe('PUT');
    expect(options.headers.get('authorization')).toBe('Bearer t2');
    expect(options.headers.get('cookie')).toBe('sid=s2');
    expect(options.headers.get('if-match')).toBe('3');
    expect(new TextDecoder().decode(options.body)).toBe(JSON.stringify({ teamName: 'Updated Team' }));
  });
  it('preserves empty DELETE response and If-Match', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response(null, { status: 204 }));
    const request = new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1', { method: 'DELETE', headers: { authorization: 'Bearer t3', cookie: 'sid=s3', 'if-match': '7' } });
    const response = await DELETE(request, { params: { id: 'tb-1' } });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    const options = (global.fetch as jest.Mock).mock.calls[0]![1];
    expect(options.method).toBe('DELETE');
    expect(options.headers.get('authorization')).toBe('Bearer t3');
    expect(options.headers.get('cookie')).toBe('sid=s3');
    expect(options.headers.get('if-match')).toBe('7');
  });
  it('preserves a version conflict status and payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('{"message":"Version conflict"}', { status: 412 }));
    const response = await PUT(new NextRequest('http://localhost/api/v2/team-bookings/tb-1', { method: 'PUT', body: '{}' }), { params: { id: 'tb-1' } });
    expect(response.status).toBe(412);
    expect(await response.json()).toEqual({ message: 'Version conflict' });
  });
});
