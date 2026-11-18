// Run only against a disposable LAN deployment. Creates a user, a booking and a conversation.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const base = new URL(process.env.BASE_URL);
const company = process.env.ENTRIP_COMPANY_CODE || 'entrip';
const email = process.env.ENTRIP_ADMIN_EMAIL || 'admin@entrip.local';
const password = process.env.ENTRIP_ADMIN_PASSWORD;
const output = process.env.VERIFICATION_OUTPUT_DIR;
assert.equal(process.env.LAN_SMOKE_DISPOSABLE, '1', 'Use a disposable deployment and set LAN_SMOKE_DISPOSABLE=1.');
assert.ok(password, 'Set ENTRIP_ADMIN_PASSWORD to the disposable administrator password.');
assert.equal(base.protocol, 'http:');
assert.ok(!/^(localhost|127\.|\[::1\])/.test(base.hostname), 'Use the LAN URL, not localhost.');
const args = ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'];
if (process.env.ENTRIP_VERIFY_HOST_MAP === 'loopback') args.push(`--host-resolver-rules=MAP ${base.hostname} 127.0.0.1`);
const env = { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '', http_proxy: '', https_proxy: '', all_proxy: '' };
const browser = await chromium.launch({ args, env, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}) });
const report = { status: 'FAIL', transport: process.env.ENTRIP_VERIFY_HOST_MAP === 'loopback' ? 'Browser HTTP LAN origin mapped to loopback' : 'Browser HTTP connection to supplied LAN address', checks: [], pageErrors: [] };
const staffEmail = `lan-${Date.now()}@example.test`;
const staffPassword = randomBytes(20).toString('hex');
const team = `LAN 검증 ${Date.now()}`;
let admin;
let userId;
let booking;

async function login(username, secret) {
  const context = await browser.newContext({ baseURL: base.origin });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  const socketUrls = [];
  page.on('websocket', socket => socketUrls.push(new URL(socket.url())));
  await page.goto('/login');
  assert.equal(await page.evaluate(() => window.isSecureContext), false, 'Expected a normal HTTP LAN origin');
  await page.locator('input[name="companyCode"]').fill(company);
  await expect(page.locator('[name=password]')).toHaveValue('');
  await page.locator('[name=username]').fill(username);
  await page.locator('[name=password]').fill(secret);
  const authResponse = page.waitForResponse(r => r.url().endsWith('/api/v2/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  assert.equal((await authResponse).status(), 200, 'Login API should accept the provisioned credentials');
  await page.waitForURL(url => url.pathname === '/');
  const logos = page.locator('header img');
  await expect(logos).toHaveCount(2);
  await logos.evaluateAll(async images => {
    await Promise.all(images.map(image => image.decode()));
    if (images.some(image => !image.naturalWidth)) throw new Error('LAN header image failed to load');
  });
  const cookies = await context.cookies();
  assert.ok(cookies.some(c => c.httpOnly && c.domain === base.hostname && !c.secure), 'Expected an HttpOnly LAN session cookie on this browser hostname');
  return { context, page, socketUrls };
}

async function checkLive(client) {
  await client.page.goto('/chat');
  await client.page.getByText('실시간 연결됨', { exact: true }).waitFor();
  assert.ok(client.socketUrls.some(url => url.protocol === 'ws:' && url.host === base.host && url.pathname === '/socket.io/'), 'Expected a WebSocket handshake on the public gateway port');
}

async function cleanupRecord(page, route, version) {
  return page.evaluate(async ({ route, version }) => {
    const headers = version === undefined ? {} : { 'If-Match': String(version) };
    return (await fetch(route, { method: 'DELETE', credentials: 'same-origin', headers })).status;
  }, { route, version });
}

try {
  admin = await login(email, password);
  await admin.page.goto('/settings');
  await admin.page.getByRole('button', { name: '직원 추가', exact: true }).click();
  const dialog = admin.page.getByRole('dialog', { name: '직원 추가', exact: true });
  await dialog.getByLabel('이름', { exact: true }).fill('LAN 검증 직원');
  await dialog.getByLabel('이메일', { exact: true }).fill(staffEmail);
  await dialog.getByLabel('초기 비밀번호', { exact: true }).fill(staffPassword);
  const newUser = admin.page.waitForResponse(r => r.url().endsWith('/api/v2/users') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: '저장', exact: true }).click();
  const userResponse = await newUser;
  assert.equal(userResponse.status(), 201);
  userId = (await userResponse.json()).id;
  assert.ok(userId);
  const staff = await login(staffEmail, staffPassword);
  report.checks.push('Provisioned administrator creates employee through settings; independent employee signs in on the same LAN origin');

  await admin.page.goto('/list-monthly');
  await admin.page.getByRole('button', { name: '+ 예약 등록', exact: true }).click();
  const editor = admin.page.getByRole('dialog', { name: '새 예약 등록', exact: true });
  await editor.getByLabel('팀명 *', { exact: true }).fill(team);
  await editor.getByLabel('출발지 *', { exact: true }).fill('부산');
  await editor.getByLabel('목적지 *', { exact: true }).fill('제주');
  const saved = admin.page.waitForResponse(r => new URL(r.url()).pathname === '/api/v2/bookings' && r.request().method() === 'POST');
  await editor.getByRole('button', { name: '예약 저장', exact: true }).click();
  const bookingResponse = await saved;
  assert.ok(bookingResponse.ok(), `Create booking returned ${bookingResponse.status()}`);
  booking = (await bookingResponse.json()).data;
  assert.ok(booking.id && booking.version);
  await staff.page.goto('/list-monthly');
  await expect(staff.page.getByRole('row').filter({ hasText: team })).toBeVisible();
  await staff.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await staff.page.reload();
  await expect(staff.page.getByRole('row').filter({ hasText: team })).toBeVisible();
  report.checks.push('Both browser sessions see the stored reservation; cookie-only reload preserves employee access');

  await checkLive(staff);
  await checkLive(admin);
  await admin.page.getByRole('button', { name: '조직도', exact: true }).click();
  const contact = admin.page.locator('aside').getByText(staffEmail, { exact: false }).locator('../..');
  await contact.getByRole('button', { name: '1:1 대화' }).click();
  const outbound = `관리자 메시지 ${Date.now()}`;
  const inbound = `직원 회신 ${Date.now()}`;
  await admin.page.getByRole('textbox', { name: '메시지', exact: true }).fill(outbound);
  await admin.page.getByRole('button', { name: '전송', exact: true }).click();
  const room = staff.page.locator('aside button').filter({ hasText: outbound });
  await expect(room).toBeVisible({ timeout: 6500 });
  await room.click();
  await expect(staff.page.locator('main p').getByText(outbound, { exact: true })).toBeVisible();
  await staff.page.getByRole('textbox', { name: '메시지', exact: true }).fill(inbound);
  await staff.page.getByRole('button', { name: '전송', exact: true }).click();
  await expect(admin.page.locator('main p').getByText(inbound, { exact: true })).toBeVisible({ timeout: 6500 });
  report.checks.push('Browser WebSockets connect through the LAN gateway; administrator and employee exchange messages before the polling interval');
  assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} catch (error) {
  report.error = error.stack || String(error);
  process.exitCode = 1;
} finally {
  if (admin) {
    // The project must be disposable because message history deliberately persists.
    if (booking) report.bookingCleanupStatus = await cleanupRecord(admin.page, `/api/v2/bookings/${booking.id}`, booking.version).catch(() => 0);
    if (userId) report.employeeCleanupStatus = await cleanupRecord(admin.page, `/api/v2/users/${userId}`).catch(() => 0);
  }
  await browser.close();
  if (output) {
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, 'lan-ui.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report));
}
