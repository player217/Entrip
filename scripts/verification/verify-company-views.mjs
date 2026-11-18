import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
if (process.env.ENTRIP_DISPOSABLE_QA !== '1') throw new Error('Run with ENTRIP_DISPOSABLE_QA=1 on a disposable company fixture.');
const baseURL = process.env.BASE_URL;
const directory = path.resolve(process.env.VERIFICATION_OUTPUT_DIR || 'company-view-results');
const tag = Date.now().toString(36);
const team = '공동 조회 검증 ' + tag;
const manager = '조회 담당 ' + tag;
const draft = '개인 초안 ' + tag;
const revenue = 723459;
const errors = [];
const result = { checks: {}, observations: {}, pageErrors: errors };
const automaticBudget = Number(process.env.QA_PASSIVE_MS || 12000);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const contexts = [];
const pane = page => page.locator('[role="tabpanel"]:visible');

function watch(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.setDefaultTimeout(12000);
  return page;
}
async function newSession(role) {
  const hasState = Boolean(process.env.QA_STATE_DIR);
  const context = await browser.newContext({ baseURL, ...(hasState ? { storageState: path.join(process.env.QA_STATE_DIR, role.toLowerCase() + '.json') } : {}), viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
  contexts.push(context);
  const page = watch(await context.newPage());
  if (hasState) {
    const profile = await page.request.get('/api/v2/users/profile');
    assert.equal(profile.status(), 200);
    assert.equal((await profile.json()).email, process.env['QA_' + role + '_EMAIL']);
  } else await login(page, role);
  return page;
}
async function login(page, role) {
  await page.goto('/login');
  await page.locator('[name=companyCode]').fill(process.env[role === 'OTHER' ? 'QA_OTHER_COMPANY' : 'QA_COMPANY']);
  await page.locator('[name=username]').fill(process.env['QA_' + role + '_EMAIL']);
  await page.locator('[name=password]').fill(process.env['QA_' + role + '_PASSWORD']);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v2/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  assert.equal((await response).status(), 200);
  await expect(page.getByRole('tablist', { name: '작업 탭' })).toBeVisible();
}
async function clone(page) {
  const context = await browser.newContext({ baseURL, storageState: await page.context().storageState(), viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
  contexts.push(context);
  return watch(await context.newPage());
}
async function open(page, route, title) {
  await page.goto(route);
  await expect(pane(page).getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function screenshot(page, file) {
  await page.screenshot({ path: path.join(directory, file + '.png') });
}
async function observed(page, check, start) {
  const sample = check;
  while (Date.now() - start < automaticBudget) {
    if (await sample()) return { mode: 'automatic', elapsedMs: Date.now() - start };
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  if (await sample()) return { mode: 'automatic', elapsedMs: Date.now() - start };
  const refresh = pane(page).getByRole('button', { name: '새로고침', exact: true });
  if (await refresh.isVisible()) await refresh.click();
  else await page.reload();
  await expect.poll(sample, { timeout: 20000 }).toBe(true);
  return { mode: 'manual refresh', passiveWaitMs: automaticBudget };
}
async function bookingA(page) {
  await open(page, '/list-monthly', '월간 목록');
  await pane(page).getByRole('button', { name: '+ 예약 등록', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '새 예약 등록' });
  await editor.getByLabel('팀명 *', { exact: true }).fill(team);
  await editor.getByLabel('출발지 *', { exact: true }).fill('부산');
  await editor.getByLabel('목적지 *', { exact: true }).fill('조회 검증 여행지');
  await editor.getByLabel('담당자 *', { exact: true }).fill(manager);
  await editor.getByLabel('인원 *', { exact: true }).fill('7');
  await editor.getByLabel('판매금액', { exact: true }).fill(String(revenue));
  const today = await page.evaluate(() => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  });
  await editor.getByLabel('출발일 *', { exact: true }).fill(today);
  await editor.getByLabel('귀국일 *', { exact: true }).fill(today);
  await editor.getByLabel('예약 상태', { exact: true }).selectOption({ label: '확정' });
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v2/bookings' && r.request().method() === 'POST');
  await editor.getByRole('button', { name: '예약 저장', exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const data = (await response.json()).data;
  assert.equal(data.teamName, team);
  assert.equal(Number(data.revenue ?? data.totalPrice), revenue);
  return data;
}
async function print(page, file, required, excluded = []) {
  await page.evaluate(() => { window.__qaPrintClicked = false; window.print = () => { window.__qaPrintClicked = true; }; });
  await page.getByRole('button', { name: '현재 페이지 인쇄' }).click();
  assert.equal(await page.evaluate(() => window.__qaPrintClicked), true);
  await page.emulateMedia({ media: 'print' });
  const destination = path.join(directory, file + '.pdf');
  await page.pdf({ path: destination, preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  const text = execFileSync('pdftotext', ['-layout', destination, '-'], { encoding: 'utf8' }).replace(/\s+/g, '');
  for (const word of required) assert.ok(text.includes(word.replace(/\s+/g, '')), 'Missing PDF text: ' + word);
  for (const word of excluded) assert.ok(!text.includes(word.replace(/\s+/g, '')), 'Inactive pane text in PDF: ' + word);
}
async function expectedDashboard(page) {
  const response = await page.request.get('/api/v2/bookings?limit=100');
  assert.equal(response.status(), 200);
  const first = await response.json();
  const rows = [...first.data];
  const total = first.pagination?.total ?? first.meta?.total ?? rows.length;
  for (let current = 2; rows.length < total; current++) {
    const r = await (await page.request.get('/api/v2/bookings?limit=100&page=' + current)).json();
    assert.ok(r.data?.length); rows.push(...r.data);
  }
  const today = await page.evaluate(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); });
  return { today: rows.filter(r => r.startDate.slice(0, 10) === today && r.status.toUpperCase() !== 'CANCELLED').length, confirmed: rows.filter(r => r.status.toUpperCase() === 'CONFIRMED').length };
}
async function flights(page, arrival) {
  await open(page, '/flight-schedule', '항공편 스케줄 조회');
  await pane(page).getByLabel('출발 공항').selectOption('PUS');
  const dest = pane(page).getByLabel('도착 공항', { exact: true });
  await expect(dest).toBeEnabled();
  await dest.selectOption(arrival);
  const table = pane(page).getByRole('region', { name: '항공사별 주간 운항 시간표' }).getByRole('table');
  await expect(table).toBeVisible();
  return table;
}
async function matrix(table) {
  return table.locator('tr').evaluateAll(trs => trs.map(tr => [...tr.cells].map(cell => cell.innerText.trim())));
}
let failure;
try {
  const [a, b, other] = await Promise.all([newSession('ADMIN'), newSession('MANAGER'), newSession('OTHER')]);
  const stats = b;
  const [dash, calendar] = await Promise.all([clone(b), clone(b)]);
  await Promise.all([open(stats, '/stats', '운영 현황'), open(dash, '/', '대시보드'), open(calendar, '/calendar-performance', '월간 캘린더'), open(other, '/stats', '운영 현황')]);
  const statRow = pane(stats).getByRole('region', { name: '담당자별 집계 표' }).getByRole('row', { name: new RegExp(manager) });
  await expect(statRow).toHaveCount(0);
  await expect(pane(dash).getByRole('heading', { name: '오늘 출발', exact: true })).toBeVisible();
  const departures = pane(dash).getByRole('heading', { level: 4, name: /^오늘 출발 \(\d+팀\)$/ }).locator('..');
  const showMore = departures.locator('button[aria-controls][aria-expanded="false"]');
  if (await showMore.isVisible()) await showMore.click();
  const filter = pane(calendar).getByLabel('예약 검색', { exact: true });
  await filter.fill(team);
  await expect(pane(calendar).getByText(team, { exact: true })).toHaveCount(0);
  const saved = await bookingA(a);
  const started = Date.now();
  const dashboardFound = async () => {
    if (await showMore.isVisible()) await showMore.click();
    return (await departures.getByText(team, { exact: true }).count()) > 0;
  };
  const calendarFound = async () => (await pane(calendar).getByText(team, { exact: true }).count()) > 0;
  const probeNames = ['dashboard', 'stats', 'calendarPerformance'];
  result.observations.bookingCreation = {};
  const probes = await Promise.all([
    observed(dash, dashboardFound, started),
    observed(stats, () => statRow.isVisible(), started),
    observed(calendar, calendarFound, started),
  ].map(async (probe, i) => {
    const observedValue = await probe;
    result.observations.bookingCreation[probeNames[i]] = observedValue;
    return observedValue;
  }));
  const cells = await statRow.locator('th,td').allInnerTexts();
  assert.deepEqual(cells.slice(0, 4), [manager, '1', '7', '723,459 원']);
  const expected = await expectedDashboard(dash);
  const countFor = label => pane(dash).getByRole('heading', { name: label, exact: true }).locator('..').locator('p').first().innerText();
  await expect.poll(() => countFor('오늘 출발')).toBe(expected.today + '건');
  await expect.poll(() => countFor('확정 예약')).toBe(expected.confirmed + '건');
  result.checks.stats = { row: cells, myConfirmedBookings: expected.confirmed, myTodayDepartures: expected.today };
  await pane(stats).getByRole('button', { name: '분기별' }).click();
  await expect(pane(stats).getByRole('button', { name: '분기별' })).toHaveAttribute('aria-pressed', 'true');
  await print(stats, 'stats', [manager, '723,459', '분기별']);
  await screenshot(stats, 'stats');
  await screenshot(dash, 'dashboard');
  await screenshot(calendar, 'calendar');
  await pane(other).getByRole('button', { name: '새로고침' }).click();
  await expect(pane(other).getByRole('row', { name: new RegExp(manager) })).toHaveCount(0);
  const denied = await other.request.get('/api/v2/bookings/' + saved.id);
  assert.equal(denied.status(), 404);
  result.checks.otherCompany = { directBooking: denied.status(), absentFromStatistics: true };
  const [flightA, flightB] = await Promise.all([clone(a), clone(b)]);
  const [tableA, tableB] = await Promise.all([flights(flightA, 'KIX'), flights(flightB, 'KIX')]);
  const [left, right] = await Promise.all([matrix(tableA), matrix(tableB)]);
  assert.deepEqual(left, right);
  assert.equal(left[0].length, 8);
  assert.ok(left.slice(1).some(row => row.join().includes('BX122') && row.join().includes('BX124')));
  await pane(flightB).getByLabel('도착 공항').selectOption('ULN');
  await expect(tableB.getByText('BX796', { exact: true }).first()).toBeVisible();
  assert.equal(await pane(flightA).getByLabel('도착 공항').inputValue(), 'KIX');
  await expect(tableA.getByText('BX122', { exact: true }).first()).toBeVisible();
  await print(flightB, 'flight-uln', ['ULN', 'BX796'], ['BX122', manager]);
  await screenshot(flightA, 'flight-a');
  await screenshot(flightB, 'flight-b');
  result.checks.flight = { identicalKixWeekdayCells: (left.length - 1) * 7, bSwitchedTo: 'ULN', aRetained: 'KIX', activePdfContains: 'BX796' };
  for (const viewer of [flightA, flightB]) {
    await open(viewer, '/mail', '메일');
    await expect(pane(viewer).getByText('연결된 메일 계정이 없습니다.')).toBeVisible();
    await open(viewer, '/flow', '업무 자동화');
    await expect(pane(viewer).getByText('자동화 실행은 아직 사용할 수 없습니다')).toBeVisible();
  }
  result.checks.integrations = { mail: 'unconfigured on both accounts', flow: 'execution unavailable on both accounts' };
  const latest = a.getByRole('dialog');
  await latest.getByLabel('예약 상태', { exact: true }).selectOption('CANCELLED');
  const cancelResult = a.waitForResponse(r => new URL(r.url()).pathname.endsWith('/bookings/' + saved.id) && ['PATCH', 'PUT'].includes(r.request().method()));
  await latest.getByRole('button', { name: '예약 저장', exact: true }).click();
  const cancelled = await cancelResult;
  assert.equal(cancelled.status(), 200);
  assert.equal((await cancelled.json()).data.status, 'CANCELLED');
  const cancellationStarted = Date.now();
  const cancelledExpected = await expectedDashboard(dash);
  const updatedStats = observed(stats, async () => await statRow.count() === 0, cancellationStarted);
  const updatedDash = observed(dash, async () => await countFor('오늘 출발') === cancelledExpected.today + '건' && await countFor('확정 예약') === cancelledExpected.confirmed + '건', cancellationStarted);
  const [cancelStats, cancelDash] = await Promise.all([updatedStats, updatedDash]);
  result.observations.bookingCancellation = { stats: cancelStats, dashboard: cancelDash };
  result.checks.cancelledTotals = cancelledExpected;
  if (process.env.QA_REQUIRE_LIVE === '1') assert.ok([cancelStats, cancelDash].every(x => x.mode === 'automatic'));
  await latest.getByRole('button', { name: '취소', exact: true }).click();
  await expect(latest).toHaveCount(0);
  const personal = await clone(a), peer = await clone(b);
  await open(personal, '/list-monthly', '월간 목록');
  await pane(personal).getByRole('button', { name: '+ 예약 등록', exact: true }).click();
  await personal.getByRole('dialog').getByLabel('팀명 *', { exact: true }).fill(draft);
  const privateTab = await personal.getByRole('tab', { selected: true }).getAttribute('id');
  await personal.getByRole('button', { name: '새 작업 탭', exact: true }).click();
  await expect(pane(personal).getByRole('heading', { name: '새 작업' })).toBeVisible();
  await personal.getByRole('complementary', { name: '주 메뉴' }).getByRole('button', { name: '메일', exact: true }).click();
  await expect(pane(personal).getByRole('heading', { name: '메일', exact: true })).toBeVisible();
  await print(personal, 'private-mail', ['연결된 메일 계정이 없습니다.'], [draft, team, '예약번호 미발급']);
  await personal.locator('[id="' + privateTab + '"]').click();
  await personal.waitForURL('**/list-monthly');
  await expect(personal.getByRole('dialog').getByLabel('팀명 *', { exact: true })).toHaveValue(draft);
  await personal.reload();
  await expect(personal.getByRole('dialog').getByLabel('팀명 *', { exact: true })).toHaveValue(draft);
  await open(peer, '/list-monthly', '월간 목록');
  await expect(peer.getByRole('dialog')).toHaveCount(0);
  await pane(peer).getByLabel('예약 검색', { exact: true }).fill(draft);
  await expect(pane(peer).getByLabel('예약 목록', { exact: true }).getByText('검색 조건에 맞는 예약이 없습니다.')).toBeVisible();
  for (const context of contexts.filter(item => item !== personal.context())) await context.close();
  await personal.getByRole('button', { name: '사용자 메뉴' }).click();
  await personal.getByRole('button', { name: '로그아웃', exact: true }).click();
  await personal.waitForURL(/\/login/);
  const cookies = await personal.context().cookies();
  assert.ok(!cookies.some(cookie => ['auth-token', 'refresh-token'].includes(cookie.name)));
  let signedOut = await personal.request.get('/api/v2/users/profile');
  if (signedOut.status() === 429) {
    const retryAfter = (await signedOut.json()).retryAfter;
    assert.ok(Number.isInteger(retryAfter) && retryAfter > 0);
    result.observations.signedOutRateLimitWaitSeconds = retryAfter;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 500));
    signedOut = await personal.request.get('/api/v2/users/profile');
  }
  assert.equal(signedOut.status(), 401);
  await login(personal, 'STAFF');
  await open(personal, '/list-monthly', '월간 목록');
  await expect(personal.getByRole('dialog')).toHaveCount(0);
  const stored = await personal.evaluate(() => Object.values(localStorage).join('\n'));
  assert.ok(!stored.includes(draft));
  await screenshot(personal, 'after-account-switch');
  result.checks.privacy = { draftSurvivedOriginatorReload: true, peerCannotOpenOrSearchUnsubmittedDraft: true, inactiveDraftExcludedFromMailPdf: true, signedOutProfileStatus: 401, accountSwitchShowsNoPreviousDraft: true };
  assert.deepEqual(errors, []);
  if (process.env.QA_REQUIRE_LIVE === '1') assert.ok(probes.every(x => x.mode === 'automatic'), JSON.stringify(probes));
} catch (error) {
  failure = error;
  for (const [index, ctx] of contexts.entries()) {
    const page = ctx.pages().at(-1);
    if (page) await screenshot(page, 'failure-' + index).catch(() => {});
  }
} finally {
  result.status = failure ? 'FAIL' : 'PASS';
  if (failure) result.error = String(failure.stack || failure);
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(result, null, 2));
  await browser.close();
  console.log(JSON.stringify(result));
}
if (failure) process.exitCode = 1;
