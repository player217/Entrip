// Collect app-generated PDFs from an isolated synthetic database. Never run against a production account.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log(
    'Print QA for a disposable Entrip instance with the standard demo seed. Requires Playwright Chromium and pdftotext. Set PRINT_DISPOSABLE=1, PRINT_OUTPUT_DIR and BASE_URL. Creates synthetic bookings, ledger entries, a conversation and approvals. Optional PRINT_CASES limits the scenarios. Use a fresh output folder for a new database. PRINT_AUTH_STATE accepts a private cookie-jar path outside the evidence folder.'
  );
  process.exit(0);
}
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.PRINT_OUTPUT_DIR;
assert.equal(
  process.env.PRINT_DISPOSABLE,
  '1',
  'Set PRINT_DISPOSABLE=1 only for a disposable synthetic database.'
);
assert.ok(output, 'Set PRINT_OUTPUT_DIR for PDF and comparison evidence.');
for (const s of ['pdf', 'screen', 'expected'])
  await mkdir(path.join(output, s), { recursive: true });
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
    : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const statePath = process.env.PRINT_AUTH_STATE;
const cachedState = statePath
  ? await readFile(statePath, 'utf8')
      .then(JSON.parse)
      .catch(() => undefined)
  : undefined;
const context = await browser.newContext({
  storageState: cachedState,
  baseURL,
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  viewport: { width: 1440, height: 1000 },
});
let page = await context.newPage();
page.setDefaultTimeout(20000);
page.setDefaultNavigationTimeout(120000);
const pane = () => page.locator('[role="tabpanel"]:visible');
const editor = () => page.getByRole('dialog', { name: /새 예약 등록|예약 수정/ });
const report = {
  generatedBy: 'Chromium page.pdf after application print invocation, CSS page sizing',
  documents: [],
  errors: [],
  pageErrors: [],
};
page.on('pageerror', (e) => report.pageErrors.push(e.message));
page.on('dialog', (d) => d.accept());
const keyText = (s) =>
  String(s)
    .normalize('NFKC')
    .replace(/[\s\u00ad\u200b]/g, '');
const selection = new Set((process.env.PRINT_CASES || '').split(',').filter(Boolean));
const requested = (id) => !selection.size || selection.has(id);
const persist = async () =>
  writeFile(
    path.join(
      output,
      'collector' + (selection.size ? '-' + [...selection].join('_') : '') + '.json'
    ),
    JSON.stringify(report, null, 2)
  );
async function api(resource, method = 'GET', data) {
  const fetchRequest = () =>
    context.request.fetch((process.env.PRINT_API_ORIGIN || baseURL) + '/api/v2/' + resource, {
      method,
      data,
      timeout: 60000,
      headers: { origin: baseURL },
    });
  let response = await fetchRequest();
  if (response.status() === 429) {
    const error = await response.json().catch(() => ({}));
    const seconds = Number(response.headers()['retry-after'] || error.retryAfter || 60);
    await new Promise((resolve) =>
      setTimeout(resolve, (Math.min(90, Math.max(1, seconds)) + 1) * 1000)
    );
    response = await fetchRequest();
  }
  assert.ok(
    response.ok(),
    resource + ' ' + response.status() + ' ' + (response.ok() ? '' : await response.text())
  );
  if (response.status() === 204) return null;
  const result = await response.json();
  return result.data ?? result;
}
async function open(route, title) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await pane()
    .getByRole('heading', { name: title, exact: true })
    .first()
    .waitFor({ timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
}
async function clickPrint(doc, button) {
  // Block only the OS dialogue. The real UI event has to reach window.print().
  await doc.evaluate(() => {
    window.__entripPrintInvocations = 0;
    window.print = () => {
      window.__entripPrintInvocations++;
    };
  });
  await button.click();
  await doc.waitForFunction(() => window.__entripPrintInvocations > 0);
}
async function cells(readFrom, skipLast = 0) {
  return readFrom.locator('tr:visible').evaluateAll(
    (rows, skip) =>
      rows.flatMap((row) => {
        let items = Array.from(row.children).filter((el) => el.matches('td,th'));
        if (skip) items = items.slice(0, -skip);
        return items.flatMap((el) =>
          el.innerText
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean)
        );
      }),
    skipLast
  );
}
async function documentPDF(id, doc, expected, excluded = [], options = {}) {
  const pdfPath = path.join(output, 'pdf', id + '.pdf');
  await doc.evaluate(() => document.fonts.ready);
  await doc.emulateMedia({ media: 'print' });
  const printBody = await doc.locator('body').innerText();

  await doc.pdf({
    path: pdfPath,
    format: 'A4',
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
  });
  await doc.emulateMedia({ media: 'screen' });
  const text = execFileSync('pdftotext', ['-raw', pdfPath, '-'], { encoding: 'utf8' });
  const layout = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
  const texts = [text, layout].map(keyText);
  const positive = [...new Set(expected)].filter((x) => x != null && String(x).trim() !== '');
  const negative = [
    ...new Set([
      '이전 기간',
      '계좌 저장',
      '직원 추가 · 저장',
      '직원 및 대화 검색 내비게이션',
      ...excluded,
    ]),
  ].filter(Boolean);
  const missing = positive.filter((token) => !texts.some((t) => t.includes(keyText(token))));
  if (options.sameLine)
    for (const group of options.sameLine) {
      if (
        !layout
          .split('\n')
          .some((line) => group.every((token) => keyText(line).includes(keyText(token))))
      )
        missing.push('row: ' + group.join(' | '));
    }
  if (options.accountNumbers) {
    const header = keyText('계좌 이름 은행 · 계좌 번호 예금주 현재 잔액');
    const numbers = options.accountNumbers.map(keyText);
    const sheets = text.trimEnd().split('\f').map(keyText);
    let balancePages = 0;
    for (const [index, sheet] of sheets.entries()) {
      const entries = numbers.filter(number => sheet.includes(number));
      const heading = sheet.indexOf(header);
      if (!entries.length && heading < 0 && index > 0) continue;
      balancePages++;
      if (!entries.length) missing.push(`계좌 표 ${index + 1}쪽 머리글 아래 계좌 행`);
      if (heading < 0 || entries.some(number => sheet.indexOf(number) < heading)) {
        missing.push(`계좌 표 ${index + 1}쪽 반복 열 제목`);
      }
    }
    for (const number of numbers) {
      if (sheets.filter(sheet => sheet.includes(number)).length !== 1) missing.push('계좌 행 ' + number);
    }
    if (options.requireAccountContinuation && balancePages < 2) missing.push('두 쪽 이상에 걸친 계좌 잔액 표');
  }
  if (options.flightMatrix) {
    // Read the actual ink coordinates, so a schedule moved into an adjacent weekday also fails.
    const xml = execFileSync('pdftotext', ['-bbox', pdfPath, '-'], { encoding: 'utf8' });
    const words = [
      ...xml.matchAll(
        /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="[\d.]+">([^<]+)<\/word>/g
      ),
    ].map(([, x1, y, x2, value]) => ({ x: (+x1 + +x2) / 2, y: +y, value }));
    const headers = [...'월화수목금토일'].map((day) => words.find((word) => word.value === day));
    assert.ok(headers.every(Boolean), 'Each printed weekday column must have a visible heading');
    const halfWidth = (headers[1].x - headers[0].x) / 2;
    const rows = options.flightMatrix.map(({ airline, days }) => {
      const label = words.find((w) => w.value === airline && w.y > headers[0].y);
      assert.ok(label, 'Missing printed airline heading ' + airline);
      return { y: label.y, airline, days };
    });
    for (const [i, row] of rows.entries()) {
      for (const [day, expectedCell] of row.days.entries()) {
        const wordsInCell = words.filter(
          (w) =>
            Math.abs(w.x - headers[day].x) < halfWidth &&
            w.y >= row.y - 1 &&
            w.y < (rows[i + 1]?.y ?? Infinity) - 1 &&
            /^(?:\d{2}:\d{2}|→|[A-Z\d]{2,3}\d+[A-Z]?|운항|없음|미제공|요일)$/.test(w.value)
        );
        wordsInCell.sort((a, b) => (Math.abs(a.y - b.y) < 0.2 ? a.x - b.x : a.y - b.y));
        if (
          keyText(wordsInCell.map((w) => w.value).join('')) !== keyText(expectedCell || '운항 없음')
        ) {
          missing.push('인쇄 시간표 셀 ' + row.airline + ' ' + headers[day].value);
        }
      }
    }
  }
  const leaks = negative.filter((token) => texts.some((t) => t.includes(keyText(token))));
  const pages = text.trimEnd().split('\f').length;
  const row = {
    id,
    route: new URL(page.url()).pathname,
    pages,
    checkedValues: positive.length,
    missing,
    leaks,
    source: options.source || 'Visible screen and selected controls',
    pdf: 'pdf/' + id + '.pdf',
  };
  if (options.screen) row.screen = options.screen;
  if (options.minPages && pages < options.minPages)
    row.paginationError = 'Expected at least ' + options.minPages + ' pages';
  report.documents.push(row);
  await writeFile(
    path.join(output, 'expected', id + '.json'),
    JSON.stringify({ expected: positive, excluded: negative, printDom: printBody }, null, 2)
  );
  await persist();
  console.log(
    JSON.stringify({
      id,
      pages,
      expected: positive.length,
      missing,
      leaks,
      paginationError: row.paginationError,
    })
  );
}
async function screen(id) {
  const filename = 'screen/' + id + '.png';
  await page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
  return filename;
}
async function capture(id, expected, excluded = [], options = {}) {
  const screenshot = await screen(id);
  await clickPrint(page, page.getByTestId('page-print'));
  await documentPDF(id, page, expected, excluded, { ...options, screen: screenshot });
}
async function asCase(id, fn) {
  if (!requested(id)) return;
  const local = await browser.newContext({
    baseURL,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1440, height: 1000 },
    storageState: await context.storageState(),
  });
  page = await local.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(120000);
  page.on('pageerror', (e) => report.pageErrors.push({ id, error: e.message }));
  page.on('dialog', (d) => d.accept());
  try {
    await fn();
  } catch (e) {
    report.errors.push({ id, message: e.message });
    console.error(id + ': ' + e.message);
    await screen(id + '-failed').catch(() => {});
    await persist();
  } finally {
    await local.close().catch(() => {});
  }
}
async function createData() {
  const tag = Date.now().toString(36);
  const d = await page.evaluate(() =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
  );
  const data = {
    teamName: '북해도 현장답사 ' + tag,
    customerName: '여행기획연구회',
    representative: '대표 이봄',
    contact: '000-1234-5678',
    email: 'tour@example.test',
    type: 'BUSINESS',
    origin: '부산',
    destination: '조잔케이',
    startDate: d,
    endDate: d,
    totalPax: 17,
    coordinator: '문여행',
    status: 'CONFIRMED',
    currency: 'KRW',
    totalPrice: 5143210,
    revenue: 5143210,
    depositAmount: 143210,
    notes: '사전 답사팀 객실 배정표\n도착 후 집합 장소는 동쪽 출입구입니다.',
  };
  const row = (label, i, currency, unitPrice) => ({
    id: label + i,
    name: label + ' ' + String(i).padStart(2, '0'),
    description: '일정 ' + String(i).padStart(2, '0') + ' · 예약별 요청 확인',
    date: d,
    quantity: i + 1,
    unitPrice,
    currency,
  });
  data.hotelInfo = [row('온천숙소', 1, 'JPY', 14250)];
  data.flightInfo = [row('북해항공', 2, 'USD', 318.25)];
  data.vehicleInfo = [row('전용차량', 3, 'KRW', 30500)];
  data.insuranceInfo = [row('현지가이드', 4, 'KRW', 75200)];
  const record = await api('bookings', 'POST', data);
  const many = {
    ...data,
    teamName: '단체 운영 수배표 ' + tag,
    hotelInfo: Array.from({ length: 38 }, (_, i) => row('단체숙소', i + 1, 'JPY', 1001 + i)),
  };
  const long = await api('bookings', 'POST', many);
  const users = await api('users?isActive=true&limit=100');
  const manager = users.find((u) => u.role === 'MANAGER' || u.role === 'manager');
  const manager2 = users.find(
    (u) => u.id !== manager?.id && (u.role === 'MANAGER' || u.role === 'manager')
  );
  assert.ok(manager && manager2, 'Use repository demo seed with two managers');
  const makeBank = async (name, suffix) =>
    await api('bank-accounts', 'POST', {
      accountName: name + ' ' + tag,
      bankName: '여행은행',
      holderName: '여행사업부',
      currency: 'KRW',
      accountNumber: 'DEMO-' + suffix + '-' + tag,
      openingBalance: 7654321,
    });
  const bank = await makeBank('행사 운영계좌', 'A');
  const other = await makeBank('협력사 계좌', 'B');
  const expense = '통역 수배비 ' + tag;
  const otherExpense = '현장 대여비 ' + tag;
  for (const [account, category] of [
    [bank, expense],
    [other, otherExpense],
  ])
    await api('finance', 'POST', {
      type: 'expense',
      category,
      amount: 87310,
      currency: 'KRW',
      description: '현장 일정 견적 검토',
      occurredAt: d + 'T00:00:00.000Z',
      accountId: account.id,
    });
  const title = '현지 정산 검토 ' + tag;
  const approval = await api('approvals', 'POST', {
    title,
    content: '차량 정산서와 운행 내역을 확인합니다.',
    targetType: 'custom',
    currency: 'KRW',
    steps: [
      { approverId: manager.id, order: 0 },
      { approverId: manager2.id, order: 1 },
    ],
  });
  const thread = await api('messages/conversations', 'POST', {
    participantIds: [manager.id, manager2.id],
    type: 'GROUP',
    name: '답사 운영팀 ' + tag,
  });
  const messages = ['오전 집합 장소는 동쪽 출입구입니다.', '차량 배차는 07:45에 시작합니다.'];
  for (const content of messages)
    await api('messages/conversations/' + thread.id + '/messages', 'POST', { content });
  return {
    data,
    record,
    long,
    many,
    bank,
    other,
    expense,
    otherExpense,
    title,
    approval,
    thread,
    messages,
    manager,
    manager2,
  };
}
const money = (n) => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
async function popupDocument(id, expected, excluded = [], options = {}) {
  const before = page.waitForEvent('popup');
  await editor().getByRole('button', { name: '인쇄', exact: true }).click();
  const popup = await before;
  try {
    await popup.waitForLoadState();
    await popup.locator('body').waitFor();
    await clickPrint(popup, popup.getByRole('button', { name: /인쇄/ }).first());
    await documentPDF(id, popup, expected, excluded, options);
  } finally {
    await popup.close();
  }
}
try {
  if (!cachedState)
    await api('auth/login', 'POST', {
      email: process.env.TEST_EMAIL || 'admin@entrip.com',
      password: process.env.TEST_PASSWORD || 'pass1234',
      companyCode: process.env.TEST_COMPANY || 'entrip',
    });
  if (statePath && !cachedState)
    await writeFile(statePath, JSON.stringify(await context.storageState()), { mode: 0o600 });
  if (!selection.has('fixture-only')) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await pane()
      .getByRole('heading', { name: '대시보드', exact: true })
      .waitFor({ timeout: 120000 });
  }
  const localFixture = path.join(output, 'expected', 'synthetic-fixture.json');
  let f;
  try {
    f = JSON.parse(await readFile(localFixture, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    f = await createData();
    await writeFile(localFixture, JSON.stringify(f, null, 2));
  }
  const b = f.data;
  async function selectBooking(route = '/list-monthly', title = '월간 목록', name = b.teamName) {
    await open(route, title);
    await pane().getByLabel('예약 검색', { exact: true }).fill(name);
    await pane().getByRole('button', { name, exact: true }).first().click();
    await editor().getByLabel('팀명 *', { exact: true }).waitFor();
  }
  const number = f.record.bookingNumber;
  const travelFacts = {
    '호텔 1': {
      체크아웃: b.endDate,
      '객실 타입': '트윈 산 전망',
      '예약 업체': '북해 숙박센터',
      '숙소 주소': '온천로 26',
      '숙소 연락처': '000-0421-0011',
      조식: '조식 포함',
      '숙박 일수': '2',
    },
    '항공 1': {
      항공사: '북해항공사',
      편명: 'QA712',
      '출발 공항': 'PUS',
      '도착 공항': 'CTS',
      '출발 시간': '08:25',
      도착일: b.endDate,
      '도착 시간': '11:10',
    },
    '차량 1': {
      '차량 업체': '답사 교통',
      차종: '중형 전세버스',
      '이동 구간': '공항에서 온천마을',
      '인수 시간': '11:35',
      반납일: b.endDate,
      '반납 시간': '19:20',
      '이용 시간': '7시간 45분',
      기사명: '김배차',
      '기사 연락처': '000-0522-0012',
      '탑승 인원': '17',
    },
    '기타 1': { 업체명: '현지 안내조합', '이용 종료일': b.endDate },
  };
  const newValues = Object.values(travelFacts).flatMap((fields) => Object.values(fields));
  async function closeEditor() {
    const buttons = editor().getByRole('button', { name: /^(닫기|취소|예약 편집 닫기)$/ });
    await buttons.first().click();
  }
  const common = [
    b.teamName,
    b.origin,
    b.destination,
    b.startDate,
    b.customerName,
    b.representative,
    b.contact,
    b.email,
    b.coordinator,
    '17',
    '출장·워크숍',
    '확정',
    'KRW',
    money(b.totalPrice),
    money(b.depositAmount),
    money(b.totalPrice - b.depositAmount),
    ...b.notes.split('\n'),
  ];
  const services = (d) =>
    ['hotelInfo', 'flightInfo', 'vehicleInfo', 'insuranceInfo'].flatMap((k) =>
      d[k].flatMap((r) => [
        r.name,
        r.description,
        r.date,
        r.currency,
        String(r.quantity),
        money(r.unitPrice),
        money(r.quantity * r.unitPrice),
      ])
    );
  await asCase('booking-saved', async () => {
    await selectBooking();
    // Use actual editor controls, then close and reopen the exact persisted reservation.
    for (const [name, fields] of Object.entries(travelFacts)) {
      const fieldset = editor().getByRole('group', { name, exact: true });
      for (const [field, value] of Object.entries(fields))
        await fieldset.getByLabel(field, { exact: true }).fill(value);
    }
    if (await editor().getByRole('button', { name: '예약 저장', exact: true }).isEnabled()) {
      const writing = page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname.endsWith('/bookings/' + f.record.id) &&
          r.request().method() === 'PUT'
      );
      await editor().getByRole('button', { name: '예약 저장', exact: true }).click();
      assert.equal((await writing).status(), 200);
      await closeEditor();
      await selectBooking();
    }
    const saved = await api('bookings/' + f.record.id);
    for (const [name, fields] of Object.entries(travelFacts)) {
      const fieldset = editor().getByRole('group', { name, exact: true });
      for (const [field, value] of Object.entries(fields))
        assert.equal(await fieldset.getByLabel(field, { exact: true }).inputValue(), value);
    }
    const dbFields = Object.values(saved)
      .filter(Array.isArray)
      .flatMap((rows) => rows.flatMap((r) => Object.values(r.fields ?? {})));
    for (const value of newValues)
      assert.ok(dbFields.includes(value), 'Missing persisted service field ' + value);
    assert.equal(saved.teamName, b.teamName);
    assert.equal(Number(saved.totalPrice), b.totalPrice);
    for (const k of ['hotelInfo', 'flightInfo', 'vehicleInfo', 'insuranceInfo'])
      assert.equal(saved[k][0].name, b[k][0].name);
    await editor().getByLabel('팀명 *', { exact: true }).scrollIntoViewIfNeeded();
    await screen('editor-desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await editor().getByLabel('팀명 *', { exact: true }).scrollIntoViewIfNeeded();
    await screen('editor-mobile');
    const bounds = await editor().boundingBox();
    assert.ok(bounds.width <= 391 && bounds.x >= -1);
    await editor().getByLabel('항공명', { exact: true }).first().scrollIntoViewIfNeeded();
    await screen('editor-mobile-services');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await popupDocument('booking-saved', [number, ...common, ...services(b), ...newValues], [], {
      source: 'Saved booking detail API, compared with form values; application print preview',
    });
    await closeEditor();
  });
  await asCase('booking-unsaved', async () => {
    await open('/list-monthly', '월간 목록');
    await pane().getByRole('button', { name: '+ 예약 등록', exact: true }).click();
    const draftName = '서울 연수 미저장본';
    for (const [label, value] of [
      ['팀명 *', draftName],
      ['출발지 *', '광주'],
      ['목적지 *', '서울역'],
      ['고객명', '초안 대조 고객'],
      ['입금액', '15000'],
      ['판매금액', '250000'],
    ])
      await editor().getByLabel(label, { exact: true }).fill(value);
    await editor().getByRole('button', { name: '+ 차량 추가', exact: true }).click();
    await editor().getByLabel('차량명', { exact: true }).fill('초안 전용버스');
    const expected = [
      draftName,
      '광주',
      '서울역',
      '초안 대조 고객',
      '초안 전용버스',
      '250,000',
      '15,000',
      '235,000',
      '미저장',
    ];
    await popupDocument('booking-unsaved', expected, [number, b.teamName], {
      source: 'Current unsaved UI fields',
    });
    // Native Ctrl+P follows the browser print stylesheet; page.pdf is the equivalent CDP path.
    await documentPDF('booking-native-print', page, expected, [number, b.teamName], {
      source: 'Native browser print media with open unsaved editor',
    });
    await closeEditor();
  });
  await asCase('booking-long', async () => {
    await selectBooking('/list-monthly', '월간 목록', f.long.teamName);
    const expected = [f.long.bookingNumber, f.long.teamName, ...services(f.many)];
    await popupDocument('booking-long', expected, [number], {
      minPages: 2,
      source:
        '38 saved hotel rows plus three service types; every item, date, quantity, currency, unit and extended amount',
    });
    await closeEditor();
  });
  for (const [id, route, title] of [
    ['month-calendar', '/calendar-monthly', '월간 캘린더'],
    ['week-calendar', '/calendar-weekly', '주간 캘린더'],
    ['month-list', '/list-monthly', '월간 목록'],
    ['week-list', '/list-weekly', '주간 목록'],
    ['calendar-performance', '/calendar-performance', '월간 캘린더'],
  ]) {
    await asCase(id, async () => {
      await open(route, title);
      await pane().getByLabel('예약 검색', { exact: true }).fill(b.teamName);
      await pane().getByLabel('예약 상태 필터', { exact: true }).selectOption('CONFIRMED');
      const isList = id.includes('list');
      const ui = isList ? pane().getByRole('table') : pane().getByTestId('booking-calendar-grid');
      await ui.getByText(b.teamName, { exact: true }).first().waitFor();
      const expected = [b.teamName, '확정', b.destination, '17명', money(b.totalPrice)];
      if (isList) expected.push(b.startDate, b.coordinator, b.customerName, '출장·워크숍');
      await capture(id, expected, [f.long.teamName], {
        source:
          'Search and confirmed status applied to visible date period; matching booking API data and displayed total',
      });
    });
  }
  await asCase('list-pagination', async () => {
    const file = path.join(output, 'expected', 'bulk-fixture.json');
    let records;
    try {
      records = JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      records = [];
      const stored = await api('bookings?limit=100&page=1&orderBy=startDate&order=asc');
      for (let i = 1; i <= 32; i++) {
        const teamName = '교육 접수 ' + String(i).padStart(2, '0');
        const existing = stored.find((r) => r.teamName === teamName);
        if (existing) {
          records.push(existing);
          continue;
        }
        const day = b.startDate.slice(0, 8) + String(1 + ((i - 1) % 27)).padStart(2, '0');
        const record = await api('bookings', 'POST', {
          teamName,
          type: 'GROUP',
          origin: '여수',
          destination: '부산',
          startDate: day,
          endDate: day,
          totalPax: i + 1,
          coordinator: '이교육',
          customerName: '교육 운영팀',
          status: 'CONFIRMED',
          currency: 'KRW',
          totalPrice: 34500 + i,
        });
        records.push(record);
      }
      await writeFile(file, JSON.stringify(records));
    }
    await open('/list-monthly', '월간 목록');
    await pane().getByLabel('예약 검색', { exact: true }).fill('교육 접수');
    const t = pane().getByRole('table');
    await expect(t.locator('tbody tr')).toHaveCount(32);
    await capture(
      'list-pagination',
      [
        '32건',
        ...records.flatMap((row) => [
          row.teamName,
          row.startDate.slice(0, 10),
          money(row.totalPrice),
        ]),
      ],
      [b.teamName],
      {
        minPages: 2,
        sameLine: records.map((r) => [r.teamName, r.startDate.slice(0, 10), money(r.totalPrice)]),
        source:
          '32 distinct filtered stored booking rows; every team, date, and amount independently matched',
      }
    );
  });
  await asCase('calendar-dense', async () => {
    const query = page.waitForResponse(
      (r) => r.url().includes('/api/v2/bookings?') && r.request().method() === 'GET' && r.ok()
    );
    await open('/calendar-monthly', '월간 캘린더');
    const response = await query;
    const firstPage = await response.json();
    const records = [...firstPage.data];
    for (let n = 2; records.length < firstPage.pagination.total; n++) {
      const parameters = new URL(response.url()).searchParams;
      parameters.set('page', String(n));
      const more = await api('bookings?' + parameters);
      assert.ok(more.length, 'All paginated calendar bookings must be available');
      records.push(...more);
    }
    const grid = pane().getByTestId('booking-calendar-grid');
    await grid.getByText(b.teamName, { exact: true }).first().waitFor();
    const overlapping = records.filter(
      (r) =>
        r.startDate.slice(0, 10) <= b.startDate.slice(0, 10) &&
        r.endDate.slice(0, 10) >= b.startDate.slice(0, 10)
    );
    assert.ok(overlapping.length > 2, 'Fixture has three or more bookings on the reference day');
    const overflow = overlapping.slice(2).map((row) => records.indexOf(row) + 1);
    const keys = records.map((r) => [
      r.teamName,
      r.startDate.slice(0, 10),
      money(r.totalPrice ?? r.revenue ?? 0),
    ]);
    await capture(
      'calendar-dense',
      [
        `${records.length}건`,
        `외 ${overflow.length}건 · 일정 ${overflow.join(', ')}`,
        ...keys.flat(),
      ],
      [],
      {
        sameLine: keys,
        minPages: 2,
        source:
          'Unfiltered monthly calendar; all API ledger rows, selected-day overflow count and exact cross-references compared with PDF',
      }
    );
  });
  await asCase('dashboard', async () => {
    await open('/', '대시보드');
    const labels = await pane().locator('h3:visible,h4:visible').allInnerTexts();
    const values = await pane().locator('h3:visible + p').allInnerTexts();
    const chartRows = await pane()
      .locator('.chart-print-data tbody tr')
      .evaluateAll((rows) =>
        rows.map((tr) => [...tr.children].map((cell) => cell.textContent.trim()))
      );
    assert.ok(chartRows.length);
    await capture(
      'dashboard',
      [...labels, ...values, ...chartRows.flat()].filter((x) => !x.includes('처리 대기 중 (')),
      [],
      {
        sameLine: chartRows,
        source: 'Visible KPI and section values; exact label/value pairs for both charts',
      }
    );
  });
  await asCase('stats', async () => {
    await open('/stats', '운영 현황');
    await pane().getByRole('button', { name: '분기별', exact: true }).click();
    await pane().getByRole('table').first().waitFor();
    await capture('stats', ['분기별', ...(await cells(pane().locator('table:visible')))]);
  });
  await asCase('flights', async () => {
    await open('/flight-schedule', '항공편 스케줄 조회');
    await pane().getByLabel('출발 공항').selectOption('PUS');
    await expect(pane().getByLabel('도착 공항')).toBeEnabled({ timeout: 25000 });
    const destinations = await pane()
      .getByLabel('도착 공항')
      .locator('option')
      .evaluateAll((xs) => xs.map((x) => x.value).filter(Boolean));
    const dest = destinations.includes('KIX') ? 'KIX' : destinations[0];
    await pane().getByLabel('도착 공항').selectOption(dest);
    const table = pane()
      .getByRole('region', { name: '항공사별 주간 운항 시간표' })
      .getByRole('table');
    await table.waitFor();
    const matrix = await table.evaluate((el) =>
      [...el.querySelectorAll('tbody tr')].map((row) => ({
        airline: row.querySelector('th').innerText,
        days: [...row.querySelectorAll('td')].map((td) => td.innerText.trim()),
      }))
    );
    assert.ok(matrix.length);
    const sourceStamp = await pane()
      .getByText(/^자료 기준:/)
      .innerText();
    await capture(
      'flights',
      [
        'PUS',
        dest,
        sourceStamp,
        ...matrix.flatMap(({ airline, days }) => [
          airline,
          ...days.flatMap((day) => day.split(/\s+/)),
        ]),
      ],
      [],
      {
        source:
          'Actual flight service; compared displayed source timestamp and every physical airline × weekday PDF cell with its lookup-screen times and flight numbers',
        flightMatrix: matrix,
      }
    );
  });
  const visibleAccountNumbers = () => pane().locator('.account-cards article').evaluateAll(cards =>
    cards.map(card => card.querySelector('p').innerText.split(' · ').at(-1))
  );
  await asCase('accounts', async () => {
    await open('/accounts', '계좌 관리');
    await pane().getByLabel('계좌 필터').selectOption(f.bank.id);
    await pane().getByRole('row').filter({ hasText: f.expense }).waitFor();
    await capture(
      'accounts',
      [
        f.bank.accountName,
        f.bank.bankName,
        f.expense,
        '87,310',
        '7,654,321',
        ...(await cells(pane().getByRole('table'), 1)),
      ],
      [f.otherExpense],
      { accountNumbers: await visibleAccountNumbers() }
    );
  });
  await asCase('account-draft', async () => {
    await open('/accounts', '계좌 관리');
    await pane().getByRole('button', { name: '계좌 추가', exact: true }).click();
    for (const [label, value] of [
      ['계좌 이름', '미저장 출장계좌'],
      ['은행', '답사 은행'],
      ['계좌 번호', 'TEST-1234567'],
      ['예금주', '이수배'],
      ['기초잔액', '750023'],
    ])
      await pane().getByLabel(label, { exact: true }).fill(value);
    await capture(
      'account-draft',
      ['미저장 출장계좌', '답사 은행', 'TEST-1234567', '이수배', '750,023'],
      [f.expense]
    );
    await pane().getByRole('button', { name: '취소', exact: true }).first().click();
  });
  await asCase('transaction-draft', async () => {
    await open('/accounts', '계좌 관리');
    await pane().getByRole('button', { name: '거래 등록', exact: true }).click();
    await pane().getByLabel('계좌', { exact: true }).selectOption(f.bank.id);
    for (const [label, value] of [
      ['항목', '미저장 차량대금'],
      ['금액', '45321'],
      ['적요', '정산 서류 대기'],
    ])
      await pane().getByLabel(label, { exact: true }).fill(value);
    await capture(
      'transaction-draft',
      [f.bank.accountName, '미저장 차량대금', '45,321', '정산 서류 대기'],
      [f.expense]
    );
    await pane().getByRole('button', { name: '취소', exact: true }).first().click();
  });
  await asCase('approval', async () => {
    await open('/approval', '결재 관리');
    await pane().getByRole('button', { name: '대기', exact: true }).first().click();
    await pane().getByRole('heading', { name: f.title, exact: true }).waitFor();
    await capture('approval', [
      f.title,
      f.approval.content,
      f.manager.name,
      f.manager2.name,
      '대기',
    ]);
  });
  await asCase('approval-draft', async () => {
    await open('/approval', '결재 관리');
    await pane().getByRole('button', { name: '결재 요청', exact: true }).click();
    await pane().getByLabel('제목', { exact: true }).fill('미저장 결재 문서');
    await pane().getByLabel('요청 내용', { exact: true }).fill('현장차량 견적 변경');
    await pane().getByLabel('1차 결재자').selectOption(f.manager.id);
    await capture(
      'approval-draft',
      ['미저장 결재 문서', '현장차량 견적 변경', f.manager.name],
      [f.title]
    );
    await pane().getByRole('button', { name: '취소', exact: true }).first().click();
  });
  await asCase('settings', async () => {
    await open('/settings', '설정');
    await pane().getByLabel('직원 검색').fill(f.manager.email);
    const table = pane().getByRole('table');
    await table.getByText(f.manager.email, { exact: true }).waitFor();
    await capture(
      'settings',
      [f.manager.email, f.manager.name, ...(await cells(table, 1))],
      [f.manager2.email]
    );
  });
  await asCase('employee-draft', async () => {
    await open('/settings', '설정');
    await pane().getByRole('button', { name: '직원 추가', exact: true }).click();
    const modal = page.getByRole('dialog', { name: '직원 추가', exact: true });
    const secret = 'DoNotPrint-12345!';
    for (const [label, value] of [
      ['이름', '고수배'],
      ['이메일', 'staff-draft@example.test'],
      ['부서', '일정기획'],
      ['초기 비밀번호', secret],
    ])
      await modal.getByLabel(label, { exact: true }).fill(value);
    const button = modal.getByRole('button', { name: /인쇄/ });
    if (await button.count()) await clickPrint(page, button.first());
    else await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await documentPDF(
      'employee-draft',
      page,
      ['고수배', 'staff-draft@example.test', '일정기획'],
      [secret, '초기 비밀번호', f.manager.email],
      { source: 'Open unsaved employee with explicit password exclusion' }
    );
    await modal.getByRole('button', { name: '취소', exact: true }).click();
  });
  await asCase('chat', async () => {
    await open('/chat', '메신저');
    await pane().getByRole('button').filter({ hasText: f.thread.name }).first().click();
    const thread = pane().getByRole('region', { name: '대화 메시지' });
    await thread.getByText(f.messages[1], { exact: true }).waitFor();
    await pane()
      .getByRole('textbox', { name: '메시지', exact: true })
      .fill('보내지 않은 테스트 문장');
    await capture('chat', [f.thread.name, ...f.messages], ['보내지 않은 테스트 문장']);
  });
  for (const [id, route, title, expected] of [
    ['mail', '/mail', '메일', ['메일 연동이 설정되지 않았습니다', '연결된 메일 계정이 없습니다']],
    ['flow', '/flow', '업무 자동화', ['자동화 실행은 아직 사용할 수 없습니다', '연결 상태']],
    ['workspace', '/workspace', '새 작업', ['새 작업']],
  ])
    await asCase(id, async () => {
      await open(route, title);
      await capture(id, expected);
    });
  await asCase('login', async () => {
    const guest = await browser.newContext({ baseURL, locale: 'ko-KR' });
    const signin = await guest.newPage();
    try {
      await signin.goto('/login');
      const email = 'login-source@example.test',
        password = 'Login-DoNotPrint-7';
      await signin.locator('input[name=username]').fill(email);
      await signin.locator('input[name=password]').fill(password);
      await documentPDF(
        'login',
        signin,
        ['로그인', '로그인이 필요한 화면입니다'],
        [email, password, '회사 선택', '역할 선택'],
        { source: 'Native browser print with deliberately populated login controls' }
      );
    } finally {
      await guest.close();
    }
  });
  await asCase('inactive-tab', async () => {
    await open('/settings', '설정');
    const nav = page.getByRole('navigation').first();
    await nav.getByRole('button', { name: '메일', exact: true }).click({ modifiers: ['Control'] });
    await pane().getByRole('heading', { name: '메일', exact: true }).waitFor();
    const hidden = page.locator('[role=tabpanel][hidden]');
    assert.ok((await hidden.count()) > 0, 'Expected at least one hidden workspace');
    await capture(
      'inactive-tab',
      ['연결된 메일 계정이 없습니다'],
      [f.manager.email, '직원 목록', '직원 및 접근 권한 관리']
    );
  });
  await asCase('accounts-pagination', async () => {
    // Keep the previous reports on their original data. Seed this long ledger last.
    const existing = await api('bank-accounts?limit=100&page=1');
    for (let n = 1; n <= 34; n++) {
      const suffix = String(n).padStart(2, '0');
      const accountNumber = 'PRINT-PAGE-' + suffix;
      if (!existing.some(account => account.accountNumber === accountNumber)) {
        await api('bank-accounts', 'POST', {
          accountName: '인쇄 검증 계좌 ' + suffix, bankName: '인쇄검증은행',
          holderName: '인쇄검증팀', currency: 'KRW', openingBalance: 50000 + n, accountNumber,
        });
      }
    }
    await open('/accounts', '계좌 관리');
    await pane().locator('.account-cards').getByText('인쇄 검증 계좌 34', { exact: true }).waitFor();
    await pane().getByLabel('계좌 필터').selectOption(f.bank.id);
    await pane().getByRole('row').filter({ hasText: f.expense }).waitFor();
    const numbers = await visibleAccountNumbers();
    await capture('accounts-pagination', [...numbers, f.expense], [f.otherExpense], {
      accountNumbers: numbers, requireAccountContinuation: true,
      source: 'Printed bank account numbers on each page compared with the visible cards and repeated column headings.',
    });
  });
} catch (e) {
  report.errors.push({ id: 'setup', message: e.message });
  console.error(e.message);
} finally {
  report.status =
    report.errors.length ||
    report.pageErrors.length ||
    report.documents.some((d) => d.missing.length || d.leaks.length || d.paginationError)
      ? 'FAIL'
      : 'PASS';
  await persist();
  await browser.close();
  console.log(
    JSON.stringify({
      status: report.status,
      documents: report.documents.length,
      errors: report.errors,
      pageErrors: report.pageErrors,
    })
  );
  if (report.status !== 'PASS') process.exitCode = 1;
}
