import { browserAccessPolicy } from '../config/browser-access';

test('LAN HTTP accepts exact launcher addresses including port and supports host-only cookies over HTTP', () => {
  const origin = 'http://192.168.20.10:3000';
  const policy = browserAccessPolicy('production', origin, true, `http://localhost:3000,${origin}`);
  expect(policy.secureCookies).toBe(false);
  expect(policy.permitsOrigin(origin)).toBe(true);
  expect(policy.permitsOrigin('http://192.168.20.10:4000')).toBe(false);
  expect(policy.permitsOrigin('null')).toBe(false);
  expect(policy.permitsOrigin(undefined)).toBe(false);
});

test('standard production keeps Secure cookies and its configured origin', () => {
  const policy = browserAccessPolicy('production', 'https://entrip.example', false, 'http://localhost:3000');
  expect(policy.secureCookies).toBe(true);
  expect(policy.origins).toEqual(['https://entrip.example']);
});

test.each(['', '*', 'https://192.168.20.10:3000', 'http://localhost:3000/path'])(
  'invalid LAN origin configuration fails at startup (%s)', value => {
    expect(() => browserAccessPolicy('production', 'http://localhost:3000', true, value)).toThrow();
  }
);
