/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

describe('/api/messages proxy contract', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.INTERNAL_API_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.INTERNAL_API_URL = 'http://api-v1-test:4001';
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    if (originalApiUrl === undefined) delete process.env.INTERNAL_API_URL;
    else process.env.INTERNAL_API_URL = originalApiUrl;
    jest.resetAllMocks();
  });

  it('forwards GET with query, auth header, and cookie', async () => {
    const route = await import('../route');

    const req = new NextRequest('http://localhost:3000/api/messages/rooms/1?limit=10', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-token',
        cookie: 'sid=test-session',
      },
    });

    const res = await route.GET(req as any, { params: { path: ['rooms', '1'] } } as any);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v1-test:4001/api/messages/rooms/1?limit=10',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          Cookie: 'sid=test-session',
        }),
      }),
    );
  });

  it('forwards POST body as JSON', async () => {
    const route = await import('../route');

    const req = new NextRequest('http://localhost:3000/api/messages/rooms', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });

    const res = await route.POST(req as any, { params: { path: ['rooms'] } } as any);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v1-test:4001/api/messages/rooms',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'hello' }),
      }),
    );
  });

  it('forwards PUT and DELETE to same message path', async () => {
    const route = await import('../route');

    const putReq = new NextRequest('http://localhost:3000/api/messages/42', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'updated' }),
    });
    const deleteReq = new NextRequest('http://localhost:3000/api/messages/42', { method: 'DELETE' });

    const putRes = await route.PUT(putReq as any, { params: { path: ['42'] } } as any);
    const delRes = await route.DELETE(deleteReq as any, { params: { path: ['42'] } } as any);

    expect(putRes.status).toBe(200);
    expect(delRes.status).toBe(200);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://api-v1-test:4001/api/messages/42',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://api-v1-test:4001/api/messages/42',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
