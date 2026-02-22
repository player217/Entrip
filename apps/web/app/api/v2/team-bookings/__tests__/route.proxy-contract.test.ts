/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

describe('/api/v2/team-bookings proxy contract', () => {
  const originalFetch = global.fetch;
  const originalApiV2 = process.env.API_V2_URL;

  beforeEach(() => {
    process.env.API_V2_URL = 'http://api-v2-test:4000';
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    if (originalApiV2 === undefined) delete process.env.API_V2_URL;
    else process.env.API_V2_URL = originalApiV2;
    jest.resetAllMocks();
  });

  it('forwards GET with query and headers to v2 team-bookings', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings?page=1&pageSize=10', {
      method: 'GET',
      headers: {
        authorization: 'Bearer t1',
        cookie: 'sid=s1',
        'x-test-run-id': 'run-1',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/team-bookings?page=1&pageSize=10',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer t1',
          Cookie: 'sid=s1',
          'X-Test-Run-Id': 'run-1',
        }),
      }),
    );
  });

  it('forwards POST body to v2 team-bookings', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/team-bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ teamName: 'Alpha Team' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/team-bookings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ teamName: 'Alpha Team' }),
      }),
    );
  });
});
