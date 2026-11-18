// Exercise a disposable LAN host with separate, UI-authenticated users.
// QA_STATE_DIR contains private staff.json, manager.json and other.json storage states.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
assert.equal(process.env.LAN_SMOKE_DISPOSABLE, '1', 'Use a disposable Entrip instance.');
const baseURL = process.env.BASE_URL;
const states = process.env.QA_STATE_DIR;
const output = process.env.VERIFICATION_OUTPUT_DIR;
assert.ok(baseURL && states && output, 'Set BASE_URL, QA_STATE_DIR and VERIFICATION_OUTPUT_DIR.');
const timeout = Number(process.env.BOOKING_OBSERVATION_MS || 12000);
const requirePassive = process.env.BOOKING_REQUIRE_PASSIVE === '1';
const tag = '공유예약 ' + randomUUID().slice(0, 8);
const changed = tag + ' 공동확정';
const origin = '부산',
  target = '삿포로';
const baseAmount = 2867000,
  editedAmount = 3149000,
  deposit = 460000;
const report = {
  status: 'FAIL',
  observationMs: timeout,
  checks: [],
  observations: [],
  pageErrors: [],
  screenshots: [],
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
    : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'],
});
await mkdir(output, { recursive: true });
const routes = [
  ['month-list', '/list-monthly'],
  ['week-list', '/list-weekly'],
  ['month', '/calendar-monthly'],
  ['week', '/calendar-weekly'],
];
function pass(check, details) {
  report.checks.push({ check, ...details });
  console.log(check);
}
const button = (node, name) => node.getByRole('button', { name, exact: true });
const label = (node, name) =>
  name === '메모'
    ? node.getByRole('textbox', { name: /^메모/ })
    : node.getByLabel(name, { exact: true });
const dialog = (v) => v.page.getByRole('dialog');
const match = (v, team) =>
  v.area.getByRole('button', { name: new RegExp('^' + team + '(?:$| )') }).first();
const footer = (v) => v.area.locator(':scope > footer');
const money = (n) => n.toLocaleString('ko-KR');
const normal = (s) => s.replace(/[\s\u200b\u00ad]/gu, '');
async function newView(account, [type, route]) {
  const context = await browser.newContext({
    baseURL,
    storageState: path.join(states, account + '.json'),
    viewport: { width: 1440, height: 920 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(16000);
  page.on('pageerror', (err) => report.pageErrors.push(err.message));
  page.on('dialog', (x) => x.accept().catch(() => {}));
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  const area = page.getByTestId('booking-' + type);
  await expect(area).toBeVisible();
  await expect(footer({ area })).toContainText(/예약 \d+건/);
  await label(area, '예약 검색').fill(tag);
  return { context, page, area, type, route, account };
}
async function screenshot(v, name) {
  const filename = name + '.png';
  await v.page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
  report.screenshots.push(filename);
}
async function write(v, method, recordId) {
  const wanted = '/api/v2/bookings' + (recordId ? '/' + recordId : '');
  const promise = v.page.waitForResponse(
    (r) => r.request().method() === method && new URL(r.url()).pathname === wanted
  );
  await button(dialog(v), method === 'DELETE' ? '예약 삭제' : '예약 저장').click();
  const response = await promise;
  const started = performance.now();
  return {
    status: response.status(),
    started,
    data: response.status() === 204 ? null : (await response.json()).data,
  };
}
async function observe(v, name, start, predicate, fallback) {
  for (;;) {
    if (await predicate()) {
      const ms = Math.round(performance.now() - start);
      const row = { action: name, route: v.route, reader: v.account, mode: 'passive', ms };
      report.observations.push(row);
      return row;
    }
    if (performance.now() - start >= timeout) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  await fallback();
  await expect.poll(predicate, { timeout: 10000 }).toBe(true);
  const row = {
    action: name,
    route: v.route,
    reader: v.account,
    mode: 'explicit-refresh',
    observedBeforeRefreshMs: timeout,
  };
  report.observations.push(row);
  return row;
}
const refresh = (v) => button(v.area, '새로고침').click();
const spec = [
  [
    '항공',
    '김해 왕복 항공',
    6,
    112000,
    'KRW',
    {
      항공사: '공유항공',
      편명: 'QA721',
      '출발 공항': 'PUS',
      '도착 공항': 'CTS',
      '출발 시간': '09:20',
      '도착 시간': '11:35',
    },
  ],
  [
    '호텔',
    '공유 온천 숙소',
    3,
    18300,
    'JPY',
    { '객실 타입': '패밀리 트윈', '예약 업체': '검증 호텔사', 조식: '일식 조식' },
  ],
  [
    '차량',
    '공항 셔틀',
    1,
    45000,
    'KRW',
    {
      차종: '8인승 승합차',
      '탑승 인원': '6',
      '이동 구간': '공항~숙소',
      '인수 시간': '12:10',
      기사명: '검증 기사',
    },
  ],
  ['기타', '현지 가이드', 2, 75.5, 'USD', { 업체명: '공유 현지여행사' }],
];
const basic = {
  '출발지 *': origin,
  '목적지 *': target,
  '인원 *': '6',
  고객명: '공유 고객',
  대표자: '공유 대표',
  연락처: '010-0000-0731',
  이메일: 'booking-shared@example.test',
  '팀 유형': '연수단',
  판매금액: String(baseAmount),
  입금액: String(deposit),
  메모: '공유 예약 검증 원문',
};
let current = 'prepare';
try {
  const [writer, partner, outsider, ...views] = await Promise.all([
    newView('staff', routes[2]),
    newView('manager', routes[0]),
    newView('other', routes[0]),
    ...routes.map((route) => newView('manager', route)),
    newView('staff', routes[0]),
  ]);
  const writerRead = views.pop();
  const day = await writer.page.evaluate(() => {
    const t = new Date();
    return [
      t.getFullYear(),
      String(t.getMonth() + 1).padStart(2, '0'),
      String(t.getDate()).padStart(2, '0'),
    ].join('-');
  });
  const editor = dialog(writer);
  await Promise.all(
    views.map(async (v) => {
      assert.equal(await v.page.evaluate(() => document.visibilityState), 'visible');
      assert.equal(await match(v, tag).isVisible(), false);
    })
  );
  current = 'create';
  await button(writer.area, day + ' 예약 등록').click();
  await expect(label(editor, '출발일 *')).toHaveValue(day);
  await expect(label(editor, '귀국일 *')).toHaveValue(day);
  await label(editor, '팀명 *').fill(tag);
  for (const [name, val] of Object.entries(basic)) await label(editor, name).fill(val);
  await label(editor, '예약 상태').selectOption('PENDING');
  for (const [kind, title, qty, price, code, fields] of spec) {
    await button(editor, '+ ' + kind + ' 추가').click();
    const item = editor.getByRole('group', { name: kind + ' 1', exact: true });
    await label(item, kind + '명').fill(title);
    await label(item, kind + ' 수량').fill(String(qty));
    await label(item, kind + ' 단가').fill(String(price));
    await label(item, kind + ' 통화').selectOption(code);
    for (const [k, v] of Object.entries(fields)) await label(item, k).fill(v);
  }
  const created = await write(writer, 'POST');
  assert.equal(created.status, 201);
  const id = created.data.id;
  const number = created.data.bookingNumber;
  await Promise.all(
    views.map((v) =>
      observe(
        v,
        'create',
        created.started,
        () => match(v, tag).isVisible(),
        () => refresh(v)
      )
    )
  );
  for (const v of views) {
    await expect(footer(v)).toContainText('예약 1건 · 6명');
    await expect(footer(v)).toContainText(money(baseAmount));
  }
  pass(
    'Calendar day create is shared in both calendars and both lists with correct passengers and sale.'
  );
  await screenshot(views[0], 'booking-shared-list');
  current = 'detail-and-pdf';
  await refresh(partner);
  await match(partner, tag).click();
  const peer = dialog(partner);
  for (const [k, v] of Object.entries(basic)) await expect(label(peer, k)).toHaveValue(v);
  let richFields = 0;
  for (const [kind, title, qty, price, code, fields] of spec) {
    const item = peer.getByRole('group', { name: kind + ' 1', exact: true });
    for (const [k, v] of Object.entries({
      [kind + '명']: title,
      [kind + ' 수량']: String(qty),
      [kind + ' 단가']: String(price),
      [kind + ' 통화']: code,
      ...fields,
    })) {
      await expect(label(item, k)).toHaveValue(v);
      richFields++;
    }
  }
  await screenshot(partner, 'booking-shared-detail');
  const popupPromise = partner.page.waitForEvent('popup');
  await button(peer, '인쇄').click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.evaluate(() => document.fonts.ready);
  const pdfFile = path.join(output, 'booking-shared.pdf');
  await popup.pdf({ path: pdfFile, preferCSSPageSize: true, printBackground: true });
  const printed = normal(
    execFileSync('pdftotext', ['-layout', pdfFile, '-'], { encoding: 'utf8' })
  );
  const expected = [
    tag,
    number,
    ...spec.map((s) => s[1]),
    'QA721',
    '패밀리 트윈',
    '8인승 승합차',
    '공유 현지여행사',
    money(baseAmount),
    money(deposit),
    money(baseAmount - deposit),
  ];
  for (const val of expected) assert.ok(printed.includes(normal(val)), 'PDF is missing ' + val);
  await popup.close();
  pass(
    'Second account reopened original contact, itinerary, service currency/prices and printed saved booking.',
    { detailFields: richFields + Object.keys(basic).length, pdfValues: expected.length }
  );
  current = 'other-company';
  await refresh(outsider);
  await expect(footer(outsider)).toContainText('예약 0건');
  assert.equal(await match(outsider, tag).isVisible(), false);
  const foreignRead = await outsider.context.request.get('/api/v2/bookings/' + id);
  assert.equal(foreignRead.status(), 404);
  pass('Other company search hides the booking and its detail returns 404.');
  current = 'two-editors';
  // Both editors hold the same saved version. Protect an unsaved draft while B commits first.
  await label(editor, '메모').fill('동시 수정 보존 확인');
  await label(peer, '팀명 *').fill(changed);
  await label(peer, '판매금액').fill(String(editedAmount));
  await label(peer, '호텔 단가').fill('19100');
  await label(peer, '메모').fill('매니저가 확정한 메모');
  await label(peer, '예약 상태').selectOption('CONFIRMED');
  const detailPath = '**/api/v2/bookings/' + id;
  const delaySave = async (route) => {
    if (route.request().method() === 'PUT')
      await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  };
  if (requirePassive) await partner.page.route(detailPath, delaySave);
  const saving = write(partner, 'PUT', id);
  if (requirePassive) await expect(label(peer, '팀명 *')).toBeDisabled();
  const edited = await saving;
  if (requirePassive) {
    await partner.page.unroute(detailPath, delaySave);
    pass('A pending write disables input until the saved version has been read.');
  }
  assert.equal(edited.status, 200);
  const editChecks = [
    observe(
      writerRead,
      'edit',
      edited.started,
      () => match(writerRead, changed).isVisible(),
      () => refresh(writerRead)
    ),
  ];
  if (requirePassive)
    editChecks.push(
      observe(
        writer,
        'dirty-editor-update',
        edited.started,
        () => editor.getByText(/다른 직원이 이 예약을 수정했습니다/).isVisible(),
        () => {
          throw new Error('Dirty editor failed to identify the saved revision.');
        }
      )
    );
  await Promise.all(editChecks);
  await expect(footer(writerRead)).toContainText(money(editedAmount));
  await expect(label(editor, '메모')).toHaveValue('동시 수정 보존 확인');
  const collision = await write(writer, 'PUT', id);
  assert.equal(collision.status, 412);
  await expect(editor.getByRole('alert')).toBeVisible();
  await expect(label(editor, '메모')).toHaveValue('동시 수정 보존 확인');
  await screenshot(writer, 'booking-stale-edit');
  await button(editor, '다시 불러오기').click();
  await expect(label(editor, '팀명 *')).toHaveValue(changed);
  await expect(label(editor, '메모')).toHaveValue('매니저가 확정한 메모');
  await expect(label(editor, '호텔 단가')).toHaveValue('19100');
  await button(editor, '변경 이력').click();
  const history = editor.locator('li').filter({ hasText: '매니저가 확정한 메모' }).first();
  await expect(history).toContainText(tag);
  if (process.env.QA_MANAGER_NAME) await expect(history).toContainText(process.env.QA_MANAGER_NAME);
  const hotelHistory = history.getByText('호텔 변경 전후 항목 보기', { exact: true });
  await hotelHistory.click();
  await expect(hotelHistory.locator('..')).toContainText('18,300');
  await expect(hotelHistory.locator('..')).toContainText('19,100');
  await screenshot(writer, 'booking-shared-history');
  await button(editor, '변경 이력').click();
  pass(
    'Partner edit reached original company; stale save received 412, draft was retained, reloading restored the saved revision and named booking history.'
  );
  current = 'cancellation-and-filters';
  await label(editor, '예약 상태').selectOption('CANCELLED');
  const cancelled = await write(writer, 'PUT', id);
  assert.equal(cancelled.status, 200);
  const cleanRefresh = observe(
    partner,
    'clean-open-editor-status',
    cancelled.started,
    async () => (await label(peer, '예약 상태').inputValue()) === 'CANCELLED',
    () => button(peer, '다시 불러오기').click()
  );
  const visibility = views.map((v) =>
    observe(
      v,
      'cancel',
      cancelled.started,
      async () => (await footer(v).innerText()).includes('예약 1건 · 0명'),
      () => refresh(v)
    )
  );
  await Promise.all([cleanRefresh, ...visibility]);
  for (const v of views) {
    await label(v.area, '예약 상태 필터').selectOption('CONFIRMED');
    await expect(footer(v)).toContainText('예약 0건');
    await label(v.area, '예약 상태 필터').selectOption('CANCELLED');
    await expect(footer(v)).toContainText('예약 1건 · 0명');
    assert.equal((await footer(v).innerText()).includes('판매 KRW'), false);
    await label(v.area, '예약 상태 필터').selectOption('');
  }
  pass(
    'Cancelled booking is listed under cancelled only; excluded passengers and sale agree for both time ranges.'
  );
  current = 'delete';
  await button(editor, '취소').click();
  const [cleanView, dirtyView] = views.slice(2);
  const deletedDraft = '삭제 직전 작성하던 보존용 메모';
  if (requirePassive) {
    await Promise.all(
      [cleanView, dirtyView].map(async (v) => {
        await match(v, changed).click();
        await expect(label(dialog(v), '예약 상태')).toHaveValue('CANCELLED');
      })
    );
    await label(dialog(dirtyView), '메모').fill(deletedDraft);
  }
  const deleted = await write(partner, 'DELETE', id);
  assert.equal(deleted.status, 204);
  const deletionChecks = [writerRead, ...views].map((v) =>
    observe(
      v,
      'delete',
      deleted.started,
      async () => (await footer(v).innerText()).includes('예약 0건'),
      () => refresh(v)
    )
  );
  if (requirePassive) {
    deletionChecks.push(
      observe(
        cleanView,
        'clean-editor-delete',
        deleted.started,
        () => dialog(cleanView).isHidden(),
        () => {
          throw new Error('Deleted record remained open in the clean editor.');
        }
      )
    );
    deletionChecks.push(
      observe(
        dirtyView,
        'dirty-editor-delete',
        deleted.started,
        () =>
          dialog(dirtyView)
            .getByText(/다른 직원이 이 예약을 삭제했습니다/)
            .isVisible(),
        () => {
          throw new Error('Dirty editor failed to inform the employee of deletion.');
        }
      )
    );
  }
  await Promise.all(deletionChecks);
  if (requirePassive) {
    const orphan = dialog(dirtyView);
    await expect(label(orphan, '메모')).toHaveValue(deletedDraft);
    await expect(button(orphan, '예약 저장')).toBeDisabled();
    await expect(button(orphan, '예약 삭제')).toBeDisabled();
    await expect(button(orphan, '다시 불러오기')).toBeDisabled();
    await screenshot(dirtyView, 'booking-deleted-draft');
    const opening = dirtyView.page.waitForEvent('popup');
    await button(orphan, '인쇄').click();
    const printedDraft = await opening;
    await printedDraft.waitForLoadState();
    await printedDraft.evaluate(() => document.fonts.ready);
    const draftPdf = path.join(output, 'booking-deleted-draft.pdf');
    await printedDraft.pdf({ path: draftPdf, preferCSSPageSize: true, printBackground: true });
    const orphanText = normal(
      execFileSync('pdftotext', ['-layout', draftPdf, '-'], { encoding: 'utf8' })
    );
    for (const value of ['삭제된 예약의 미저장 초안', deletedDraft])
      assert.ok(orphanText.includes(normal(value)));
    await printedDraft.close();
    pass(
      'Remote deletion closed the clean detail and preserved and labelled the unsaved editor and its PDF.'
    );
  }
  const gone = await writer.context.request.get('/api/v2/bookings/' + id);
  assert.equal(gone.status(), 404);
  await screenshot(writerRead, 'booking-shared-deleted');
  pass(
    'Second account deleted; original employee and all pre-opened reader views removed the row, and GET now returns 404.'
  );
  assert.deepEqual(report.pageErrors, []);
  if (requirePassive)
    assert.ok(
      report.observations.every((e) => e.mode === 'passive'),
      'One or more open views required an explicit refresh.'
    );
  report.status = 'PASS';
} catch (err) {
  report.failure = { step: current, detail: err.message };
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    path.join(output, 'booking-sharing.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      observations: report.observations,
      failure: report.failure,
    })
  );
}
