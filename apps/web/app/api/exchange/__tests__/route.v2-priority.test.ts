/**
 * @jest-environment node
 */
import { GET } from '../route';

describe('/api/exchange v2 priority contract', () => {
  const originalFetch = global.fetch;
  const originalV2 = process.env.INTERNAL_API_V2_URL;
  const originalFxFree = process.env.INTERNAL_FX_FREE_URL;

  beforeEach(() => {
    process.env.INTERNAL_API_V2_URL = 'http://api-v2-test:4000';
    process.env.INTERNAL_FX_FREE_URL = 'http://fx-free-test:4010';
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    if (originalV2 === undefined) delete process.env.INTERNAL_API_V2_URL;
    else process.env.INTERNAL_API_V2_URL = originalV2;
    if (originalFxFree === undefined) delete process.env.INTERNAL_FX_FREE_URL;
    else process.env.INTERNAL_FX_FREE_URL = originalFxFree;
    jest.resetAllMocks();
  });

  it('uses v2 fx endpoint first and maps CNY to CNH', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [{ cur_unit: 'CNY', deal_bas_r: '180', bkpr: '180', kftc_bkpr: '181', yy_efee_r: null, ten_dd_efee_r: null, RESULT: 1 }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    ) as any;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api-v2-test:4000/api/v2/fx/exim?base=KRW&symbols=USD,EUR,JPY,CNY',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(body[0].cur_unit).toBe('CNH');
  });

  it('falls back to fx-free when v2 source fails', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('upstream error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ cur_unit: 'USD', deal_bas_r: '1320.5', bkpr: '1318', kftc_bkpr: '1323', yy_efee_r: '0.1', ten_dd_efee_r: '0.2', RESULT: 1 }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ) as any;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://fx-free-test:4010/exim?base=KRW&symbols=USD,EUR,JPY,CNY',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(body[0].cur_unit).toBe('USD');
  });

  it('returns static fallback when all sources fail', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('upstream error', { status: 500 }))
      .mockRejectedValueOnce(new Error('fx-free unavailable')) as any;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.some((row: any) => row.cur_unit === 'CNH')).toBe(true);
  });
});
