/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as handler } from '../route';

describe('v2 catch-all proxy routes flights to v2 only', () => {
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

  it('forwards flights query to /api/v2/flights/* endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/api/v2/flights/realtime?airport=PUS', {
      method: 'GET',
    });

    const res = await handler(req as any, { params: { path: ['flights', 'realtime'] } } as any);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/flights/realtime?airport=PUS',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
