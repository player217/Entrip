#!/usr/bin/env node

const argv = process.argv.slice(2);

function argValue(flag, fallback = '') {
  const idx = argv.indexOf(flag);
  if (idx < 0) return fallback;
  return argv[idx + 1] || fallback;
}

const baseUrlRaw = argValue('--base-url', process.env.SMOKE_BASE_URL || '').trim();
if (!baseUrlRaw) {
  console.error('[smoke-v2] missing --base-url or SMOKE_BASE_URL');
  process.exit(1);
}

const baseUrl = baseUrlRaw.replace(/\/$/, '');
const allowProtectedUnauthorized = process.env.SMOKE_ALLOW_UNAUTHORIZED_PROTECTED !== 'false';
const parsedTimeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '8000');
const parsedRetries = Number(process.env.SMOKE_RETRIES || '2');
const requestTimeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 8000;
const maxAttempts = Number.isInteger(parsedRetries) && parsedRetries > 0 ? parsedRetries : 2;

const loginEmail = process.env.SMOKE_EMAIL;
const loginPassword = process.env.SMOKE_PASSWORD;
const loginCompanyCode = process.env.SMOKE_COMPANY_CODE || 'entrip';

let cookieHeader = '';
const results = [];

function collectCookies(headers) {
  const setCookie = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [];
  if (!Array.isArray(setCookie) || setCookie.length === 0) return;

  const pairs = setCookie.map((c) => c.split(';')[0]).filter(Boolean);
  cookieHeader = pairs.join('; ');
}

async function requestJson(path, { method = 'GET', body, extraHeaders } = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (cookieHeader) headers.Cookie = cookieHeader;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  collectCookies(res.headers);

  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: res.status, json, url };
}

async function requestWithRetry(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestJson(path, options);
      return { ...response, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  const cause = lastError instanceof Error ? lastError.message : String(lastError || 'unknown error');
  throw new Error(`request failed after retries (${path}): ${cause}`);
}

function recordCheck(name, passed, detail) {
  results.push({ name, passed, detail });
}

function assertCheck(name, condition, detail) {
  recordCheck(name, Boolean(condition), detail);
  if (!condition) {
    throw new Error(`${name} failed: ${detail}`);
  }
}

function printSummary() {
  console.log('\n[smoke-v2] summary');
  for (const item of results) {
    console.log(`[smoke-v2] ${item.passed ? 'PASS' : 'FAIL'} ${item.name}: ${item.detail}`);
  }
}

(async () => {
  try {
    console.log(`[smoke-v2] base: ${baseUrl}`);
    console.log(`[smoke-v2] timeout_ms=${requestTimeoutMs} retries=${maxAttempts}`);

    if (loginEmail && loginPassword) {
      const login = await requestWithRetry('/api/v2/auth/login', {
        method: 'POST',
        body: {
          email: loginEmail,
          password: loginPassword,
          companyCode: loginCompanyCode,
        },
      });
      assertCheck('login', login.status === 200, `status=${login.status} attempts=${login.attempts}`);
    } else {
      recordCheck('login', true, 'skipped (SMOKE_EMAIL/SMOKE_PASSWORD not set)');
    }

    const health = await requestWithRetry('/api/v2/health');
    assertCheck('/api/v2/health', health.status === 200, `status=${health.status} attempts=${health.attempts}`);

    const me = await requestWithRetry('/api/v2/auth/me');
    assertCheck('/api/v2/auth/me', [200, 401].includes(me.status), `status=${me.status} attempts=${me.attempts}`);

    const bookings = await requestWithRetry('/api/v2/bookings?limit=1');
    assertCheck(
      '/api/v2/bookings',
      bookings.status === 200 || (allowProtectedUnauthorized && [401, 403].includes(bookings.status)),
      `status=${bookings.status} attempts=${bookings.attempts}`,
    );

    const teamBookings = await requestWithRetry('/api/v2/team-bookings?page=1&pageSize=1');
    assertCheck(
      '/api/v2/team-bookings',
      teamBookings.status === 200 || (allowProtectedUnauthorized && [401, 403].includes(teamBookings.status)),
      `status=${teamBookings.status} attempts=${teamBookings.attempts}`,
    );

    const fx = await requestWithRetry('/api/v2/fx/exchange?from=USD&to=USD');
    assertCheck('/api/v2/fx/exchange status', [200, 404].includes(fx.status), `status=${fx.status} attempts=${fx.attempts}`);
    if (fx.status === 200) {
      const rate = fx.json?.data?.rate;
      assertCheck('/api/v2/fx/exchange rate', typeof rate === 'number' && rate === 1, `rate=${String(rate)}`);
    } else {
      recordCheck('/api/v2/fx/exchange rate', true, 'skipped (feature disabled)');
    }

    printSummary();
    console.log('[smoke-v2] passed');
  } catch (error) {
    printSummary();
    console.error('[smoke-v2] failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
