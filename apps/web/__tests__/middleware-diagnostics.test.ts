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
