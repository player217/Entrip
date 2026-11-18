/** @jest-environment node */

import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

const originalMode = process.env.NODE_ENV;
afterEach(() => Object.assign(process.env, { NODE_ENV: originalMode }));

test.each(['/icon-test', '/icon-test/', '/icon-test/details?view=all'])(
  'production rejects %s with HTTP 404 before authentication or page streaming',
  async path => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    for (const cookie of ['', 'auth-token=valid-session']) {
      const response = middleware(new NextRequest(`http://localhost:3000${path}`, { headers: { cookie } }));
      expect(response.status).toBe(404);
      expect(response.headers.get('location')).toBeNull();
      expect(await response.text()).toBe('Not Found');
    }
  }
);

test('development diagnostics remain available to signed-in developers', () => {
  Object.assign(process.env, { NODE_ENV: 'development' });
  const response = middleware(new NextRequest('http://localhost:3000/icon-test', { headers: { cookie: 'auth-token=valid-session' } }));
  expect(response.status).toBe(200);
  expect(response.headers.get('x-middleware-next')).toBe('1');
});

test('normal production pages retain their login redirect', () => {
  Object.assign(process.env, { NODE_ENV: 'production' });
  const response = middleware(new NextRequest('http://localhost:3000/calendar-monthly'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe('http://localhost:3000/login?from=%2Fcalendar-monthly');
});

test('LAN login redirect uses the published address and port, not the internal Next address', () => {
  const oldMode = process.env.NEXT_PUBLIC_ENTRIP_LAN;
  const oldOrigins = process.env.ENTRIP_LAN_ORIGINS;
  try {
    process.env.NEXT_PUBLIC_ENTRIP_LAN = 'true';
    process.env.ENTRIP_LAN_ORIGINS = 'http://127.0.0.1:4100,http://192.168.50.10:4100';
    const visit = (host: string) => middleware(new NextRequest('http://127.0.0.1:3000/calendar-monthly', { headers: { host } }));
    expect(visit('192.168.50.10:4100').headers.get('location')).toBe('http://192.168.50.10:4100/login?from=%2Fcalendar-monthly');
    expect(visit('unknown.example').status).toBe(400);
  } finally {
    if (oldMode === undefined) delete process.env.NEXT_PUBLIC_ENTRIP_LAN;
    else process.env.NEXT_PUBLIC_ENTRIP_LAN = oldMode;
    if (oldOrigins === undefined) delete process.env.ENTRIP_LAN_ORIGINS;
    else process.env.ENTRIP_LAN_ORIGINS = oldOrigins;
  }
});
