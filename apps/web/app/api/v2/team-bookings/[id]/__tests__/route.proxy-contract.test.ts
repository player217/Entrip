/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';

describe('/api/v2/team-bookings/[id] proxy contract', () => {
  const originalFetch = global.fetch;
  const originalApiV2 = process.env.API_V2_URL;

  beforeEach(() => {
    process.env.API_V2_URL = 'http://api-v2-test:4000';
    global.fetch = jest.fn().mockImplementation((url: string, init: any) => {
      if (init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, id: 'tb-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    if (originalApiV2 === undefined) delete process.env.API_V2_URL;
    else process.env.API_V2_URL = originalApiV2;
    jest.resetAllMocks();
  });

  it('forwards GET detail to v2 endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1', { method: 'GET' });
    const res = await GET(req, { params: { id: 'tb-1' } } as any);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/team-bookings/tb-1',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('forwards PUT with If-Match header and body', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1', {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer t2',
        cookie: 'sid=s2',
        'if-match': 'W/"3"',
      },
      body: JSON.stringify({ teamName: 'Updated Team' }),
    });

    const res = await PUT(req, { params: { id: 'tb-1' } } as any);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/team-bookings/tb-1',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer t2',
          Cookie: 'sid=s2',
          'If-Match': 'W/"3"',
        }),
        body: JSON.stringify({ teamName: 'Updated Team' }),
      }),
    );
  });

  it('forwards DELETE with If-Match and returns success envelope', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings/tb-1', {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer t3',
        cookie: 'sid=s3',
        'if-match': '"7"',
      },
    });

    const res = await DELETE(req, { params: { id: 'tb-1' } } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/team-bookings/tb-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer t3',
          Cookie: 'sid=s3',
          'If-Match': '"7"',
        }),
      }),
    );
  });
});
