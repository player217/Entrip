/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as handlerGet, POST as handlerPost } from '../route';

describe('v2 catch-all proxy routes notifications/metrics to v2 only', () => {
  const originalFetch = global.fetch;
  const originalV1 = process.env.USE_V1_BOOKINGS;
  const originalV1Url = process.env.INTERNAL_API_URL;
  const originalV2Url = process.env.INTERNAL_API_V2_URL;

  beforeEach(() => {
    process.env.USE_V1_BOOKINGS = 'true';
    process.env.INTERNAL_API_URL = 'http://api-v1-test:4000';
    process.env.INTERNAL_API_V2_URL = 'http://api-v2-test:4000';

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as any;
  });

  afterEach(() => {
    if (originalV1 === undefined) delete process.env.USE_V1_BOOKINGS;
    else process.env.USE_V1_BOOKINGS = originalV1;

    if (originalV1Url === undefined) delete process.env.INTERNAL_API_URL;
    else process.env.INTERNAL_API_URL = originalV1Url;

    if (originalV2Url === undefined) delete process.env.INTERNAL_API_V2_URL;
    else process.env.INTERNAL_API_V2_URL = originalV2Url;

    global.fetch = originalFetch as any;
    jest.resetAllMocks();
  });

  it('routes notifications GET to /api/v2/notifications with query preserved', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/notifications?limit=20&page=2', {
      method: 'GET',
    });

    const res = await handlerGet(req as any, { params: { path: ['notifications'] } } as any);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/notifications?limit=20&page=2',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('routes metrics GET to /api/v2/metrics endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/metrics?range=day', {
      method: 'GET',
    });

    const res = await handlerGet(req as any, { params: { path: ['metrics'] } } as any);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/metrics?range=day',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('routes notifications POST to /api/v2/notifications', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'BOOKING_CREATED' }),
    });

    const res = await handlerPost(req as any, { params: { path: ['notifications'] } } as any);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/notifications',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
