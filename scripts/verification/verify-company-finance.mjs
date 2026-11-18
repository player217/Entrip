// Run on disposable multi-account data. Money, account and approval writes go through the actual UI.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
assert.equal(
  process.env.LAN_SMOKE_DISPOSABLE,
  '1',
  'Use only an isolated disposable ENTRIP instance'
);
const baseURL = process.env.BASE_URL;
const output = process.env.QA_FINANCE_OUTPUT;
assert.ok(
  baseURL && output && process.env.QA_STATE_DIR,
  'Set BASE_URL, QA_STATE_DIR, QA_FINANCE_OUTPUT to disposable test fixtures'
);
const passiveMs = Number(process.env.QA_OBSERVE_MS || 9000);
const mustSync = process.env.QA_REQUIRE_PASSIVE === '1';
const tag = Date.now().toString(36);
const report = {
  status: 'FAIL',
  tag,
  passiveMs,
  updates: [],
  checks: [],
  files: [],
  pageErrors: [],
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'],
  ...(process.env.BROWSER_EXECUTABLE_PATH && {
    executablePath: process.env.BROWSER_EXECUTABLE_PATH,
  }),
});
const panel = (p) => p.locator('[role="tabpanel"]:visible');
const label = (p, n) => panel(p).getByLabel(n, { exact: true });
const button = (p, n) => panel(p).getByRole('button', { name: n, exact: true });
const nameCard = (p, n) =>
  panel(p)
    .locator('article')
    .filter({ has: p.getByRole('heading', { name: n, exact: true }) });
const row = (p, n) => panel(p).locator('tbody tr').filter({ hasText: n });
const text = (loc, n) => loc.getByText(n, { exact: true });
const pages = {};
function check(note) {
  report.checks.push(note);
}
async function open(role, route) {
  if (!pages[role]) {
    const ctx = await browser.newContext({
      baseURL,
      storageState: path.join(process.env.QA_STATE_DIR, role + '.json'),
      viewport: { width: 1365, height: 880 },
    });
    const page = await ctx.newPage();
    pages[role] = page;
    page.setDefaultTimeout(10000);
    page.on('dialog', (d) => d.accept());
    page.on('pageerror', (error) => report.pageErrors.push({ role, error: error.message }));
  }
  const p = pages[role];
  await p.goto(route);
  await panel(p)
    .getByRole('heading', { name: route === '/accounts' ? '계좌 관리' : '결재 관리', exact: true })
    .waitFor();
  await panel(p)
    .getByText(/^(입출금 내역|결재 요청)을 조회하는 중/)
    .waitFor({ state: 'hidden' });
  return p;
}
async function mutation(p, endpoint, method, click, expected) {
  const [res] = await Promise.all([
    p.waitForResponse(
      (res) =>
        new URL(res.url()).pathname === '/api/' + endpoint && res.request().method() === method
    ),
    click(),
  ]);
  if (res.status() !== expected)
    assert.fail(method + ' ' + endpoint + ' ' + res.status() + ' ' + (await res.text()));
  return expected === 204 ? null : (await res.json()).data;
}
async function response(p, endpoint, method = 'GET', data) {
  const res = await p.request.fetch('/api/' + endpoint, {
    method,
    headers: { Origin: new URL(baseURL).origin },
    ...(data ? { data } : {}),
  });
  return { status: res.status(), data: res.status() === 204 ? null : (await res.json()).data };
}
async function observation(title, p, loc, want = 'visible') {
  const now = Date.now(),
    stamp = { title, seconds: null, mode: 'passive' };
  try {
    await loc.waitFor({ state: want, timeout: passiveMs });
    stamp.seconds = +((Date.now() - now) / 1000).toFixed(2);
  } catch {
    stamp.mode = 'refresh button';
    stamp.passiveWindowMs = passiveMs;
    await button(p, '새로고침').click();
    await loc.waitFor({ state: want, timeout: 12000 });
  }
  report.updates.push(stamp);
  console.log('SYNC', title, stamp.mode, stamp.seconds ?? passiveMs / 1000);
}
async function pdf(p, filename, required, absent = []) {
  await p.evaluate(() => {
    window.__financePrintCalls = 0;
    window.print = () => {
      window.__financePrintCalls++;
    };
  });
  await p.getByTestId('page-print').click();
  assert.equal(await p.evaluate(() => window.__financePrintCalls), 1);
  const dest = path.join(output, filename + '.pdf');
  await p.pdf({ path: dest, preferCSSPageSize: true, printBackground: true });
  const printed = execFileSync('pdftotext', ['-layout', dest, '-'], { encoding: 'utf8' }).replace(
    /\s+/g,
    ''
  );
  for (const s of required) assert.ok(printed.includes(s.replace(/\s+/g, '')), 'PDF missing ' + s);
  for (const s of absent) assert.ok(!printed.includes(s.replace(/\s+/g, '')), 'PDF contains ' + s);
  report.files.push(filename + '.pdf');
}
async function createBank(p, n, price) {
  await button(p, '계좌 추가').click();
  for (const [k, v] of Object.entries({
    '계좌 이름': n,
    은행: '시험 은행',
    '계좌 번호': 'QA-' + n,
    예금주: '연동 검증',
    통화: 'USD',
    기초잔액: String(price),
  }))
    await label(p, k).fill(v);
  return mutation(p, 'bank-accounts', 'POST', () => button(p, '계좌 저장').click(), 201);
}
async function createEntry(p, bank, category, kind, amount) {
  await button(p, '거래 등록').click();
  await label(p, '계좌').selectOption(bank);
  await label(p, '입출금 구분').selectOption(kind);
  await label(p, '항목').fill(category);
  await label(p, '금액').fill(String(amount));
  await label(p, '거래일').fill('2026-11-18');
  await label(p, '적요').fill('공동 예약팀 금융 기록');
  return mutation(p, 'finance', 'POST', () => button(p, '거래 저장').click(), 201);
}
async function approval(p, title, people, target) {
  await button(p, '결재 요청').click();
  await label(p, '제목').fill(title);
  await label(p, '요청 내용').fill('거래 증빙과 담당자 확인');
  if (target) {
    await label(p, '결재 유형').selectOption('finance');
    await label(p, '결재할 거래').selectOption(target);
  }
  for (const [i, id] of people.entries()) {
    if (i) await button(p, '+ 결재자 추가').click();
    await label(p, i + 1 + '차 결재자').selectOption(id);
  }
  if (mustSync && target && !report.files.includes('approval-draft.pdf')) {
    const targetText = await label(p, '결재할 거래').locator('option:checked').innerText();
    const approvers = [];
    for (let i = 0; i < people.length; i++) {
      approvers.push(
        (
          await label(p, i + 1 + '차 결재자')
            .locator('option:checked')
            .innerText()
        ).split(' (')[0]
      );
    }
    await pdf(p, 'approval-draft', [
      title,
      '입출금 거래 결재',
      targetText.split(' · ')[0],
      '거래 증빙과 담당자 확인',
      ...approvers,
    ]);
  }
  return mutation(p, 'approvals', 'POST', () => button(p, '요청 제출').click(), 201);
}
async function act(p, approvalId, title, name, comment) {
  const card = nameCard(p, title);
  await card.getByLabel('결재 의견', { exact: true }).fill(comment);
  return mutation(
    p,
    'approvals/' + approvalId + '/action',
    'POST',
    () => card.getByRole('button', { name, exact: true }).click(),
    200
  );
}
async function total(p, id, value) {
  const b = await response(p, 'bank-accounts');
  assert.equal(b.status, 200);
  assert.equal(Number(b.data.find((x) => x.id === id).balance), value);
}
async function checkConcurrentEdits(admin, manager, bank) {
  await Promise.all([open('admin', '/accounts'), open('manager', '/accounts')]);
  for (const page of [admin, manager]) {
    await nameCard(page, bank.accountName)
      .getByRole('button', { name: '수정', exact: true })
      .click();
  }
  await label(admin, '예금주').fill('정산 책임자');
  await label(manager, '예금주').fill('보존할 편집본');
  await mutation(
    admin,
    'bank-accounts/' + bank.id,
    'PUT',
    () => button(admin, '계좌 저장').click(),
    200
  );
  await mutation(
    manager,
    'bank-accounts/' + bank.id,
    'PUT',
    () => button(manager, '계좌 저장').click(),
    412
  );
  await expect(panel(manager).getByRole('alert')).toContainText('다른 사용자가 계좌를 수정');
  await expect(label(manager, '예금주')).toHaveValue('보존할 편집본');
  assert.equal(
    (await response(admin, 'bank-accounts')).data.find((item) => item.id === bank.id).holderName,
    '정산 책임자'
  );
  await pdf(manager, 'account-draft', [bank.accountName, '보존할 편집본', '1,250.5 USD']);
  await button(manager, '취소').click();
  const category = '동시 편집 입금 ' + tag;
  const entry = await createEntry(manager, bank.id, category, 'income', 10);
  await observation('동시 수정 대상 대기 입금 공유', admin, text(row(admin, category), '대기'));
  for (const page of [admin, manager]) {
    await row(page, category).getByRole('button', { name: '수정', exact: true }).click();
  }
  await label(admin, '금액').fill('11.25');
  await label(manager, '금액').fill('13.75');
  await mutation(
    admin,
    'finance/' + entry.id,
    'PUT',
    () => button(admin, '거래 저장').click(),
    200
  );
  await mutation(
    manager,
    'finance/' + entry.id,
    'PUT',
    () => button(manager, '거래 저장').click(),
    412
  );
  await expect(panel(manager).getByRole('alert')).toContainText('다른 사용자가 거래를 수정');
  await expect(label(manager, '금액')).toHaveValue('13.75');
  assert.equal(Number((await response(admin, 'finance/' + entry.id)).data.amount), 11.25);
  await total(manager, bank.id, 1350);
  await pdf(manager, 'entry-draft', [
    category,
    '13.75 USD',
    bank.accountName,
    '공동 예약팀 금융 기록',
  ]);
  await button(manager, '취소').click();
  await button(manager, '새로고침').click();
  await row(manager, category).getByRole('button', { name: '수정', exact: true }).click();
  await expect(label(manager, '금액')).toHaveValue('11.25');
  await label(manager, '금액').fill('12.5');
  await mutation(
    manager,
    'finance/' + entry.id,
    'PUT',
    () => button(manager, '거래 저장').click(),
    200
  );
  assert.equal(Number((await response(admin, 'finance/' + entry.id)).data.amount), 12.5);
  check(
    'Concurrent account and pending ledger edits reject stale versions, keep both unsaved drafts intact, print exact draft values, and permit saving after reopening'
  );
}

try {
  const [manager, admin, second, staff, other] = await Promise.all([
    open('manager', '/accounts'),
    open('admin', '/accounts'),
    open('manager2', '/approval'),
    open('staff', '/accounts'),
    open('other', '/accounts'),
  ]);
  const dir = await response(manager, 'users?isActive=true&limit=100');
  assert.equal(dir.status, 200);
  const id = (role) => dir.data.find((u) => u.email === process.env['QA_' + role + '_EMAIL']).id;
  const adminId = id('ADMIN'),
    manager2Id = id('MANAGER2');
  const initial = '공동계좌-' + tag,
    n = '여행정산-' + tag;
  const bank = await createBank(manager, initial, 1000);
  await observation('같은 회사 계좌 생성', admin, nameCard(admin, initial));
  await nameCard(admin, initial).getByRole('button', { name: '수정', exact: true }).click();
  await label(admin, '계좌 이름').fill(n);
  await label(admin, '기초잔액').fill('1250.5');
  await mutation(
    admin,
    'bank-accounts/' + bank.id,
    'PUT',
    () => button(admin, '계좌 저장').click(),
    200
  );
  await observation(
    '다른 계정에서 계좌명·기초잔액 수정',
    manager,
    text(nameCard(manager, n), '1,250.5 USD')
  );
  await expect(button(staff, '계좌 추가')).toHaveCount(0);
  await expect(button(staff, '거래 등록')).toHaveCount(0);
  await button(other, '새로고침').click();
  await expect(nameCard(other, n)).toHaveCount(0);
  assert.ok(!(await response(other, 'bank-accounts')).data.some((b) => b.id === bank.id));
  check(
    'Account create, rename and fractional opening amount; staff read-only controls and other company list isolation'
  );

  const empty = '삭제테스트-' + tag;
  const disposableBank = await createBank(admin, empty, 0);
  await expect(nameCard(admin, empty)).toBeVisible();
  await nameCard(admin, empty).getByRole('button', { name: '수정', exact: true }).click();
  await mutation(
    admin,
    'bank-accounts/' + disposableBank.id,
    'DELETE',
    () => button(admin, '계좌 삭제').click(),
    204
  );
  await expect(nameCard(admin, empty)).toHaveCount(0);
  check('Empty account deletion via account editor');

  await label(admin, '계좌 필터').selectOption(bank.id);
  const cat = '단체입금-' + tag;
  const income = await createEntry(manager, bank.id, cat, 'income', 100.25);
  await observation('대기 입금 공유/계좌 필터 유지', admin, text(row(admin, cat), '대기'));
  await expect(label(admin, '계좌 필터')).toHaveValue(bank.id);
  await total(admin, bank.id, 1250.5);
  assert.equal((await response(other, 'finance/' + income.id)).status, 404);
  assert.equal(
    (await response(manager, 'finance/' + income.id + '/approve', 'PATCH', { status: 'approved' }))
      .status,
    403
  );
  assert.equal((await response(staff, 'finance/' + income.id, 'PUT', { amount: 45 })).status, 403);
  await row(manager, cat).getByRole('button', { name: '수정', exact: true }).click();
  await label(manager, '금액').fill('125.75');
  await mutation(
    manager,
    'finance/' + income.id,
    'PUT',
    () => button(manager, '거래 저장').click(),
    200
  );
  await observation('작성자 거래 수정', admin, text(row(admin, cat), '125.75 USD'));
  await mutation(
    admin,
    'finance/' + income.id + '/approve',
    'PATCH',
    () => row(admin, cat).getByRole('button', { name: '승인', exact: true }).click(),
    200
  );
  await observation('타 계정 승인 후 잔액', manager, text(nameCard(manager, n), '1,376.25 USD'));
  await total(manager, bank.id, 1376.25);
  assert.equal(
    (await response(admin, 'finance/' + income.id + '/approve', 'PATCH', { status: 'approved' }))
      .status,
    409
  );
  await total(manager, bank.id, 1376.25);
  await nameCard(manager, n).getByRole('button', { name: '수정', exact: true }).click();
  assert.ok(await label(manager, '통화').evaluate((el) => el.readOnly));
  assert.ok(await label(manager, '기초잔액').evaluate((el) => el.readOnly));
  await button(manager, '취소').click();
  check(
    'Pending income preserved balance; approved income applied once; currency and opening balance locked with transactions'
  );

  const decline = '반려입금-' + tag;
  const rejected = await createEntry(manager, bank.id, decline, 'income', 35);
  await observation('반려 대상 입금 공유', admin, text(row(admin, decline), '대기'));
  await mutation(
    admin,
    'finance/' + rejected.id + '/approve',
    'PATCH',
    () => row(admin, decline).getByRole('button', { name: '반려', exact: true }).click(),
    200
  );
  await observation(
    '관리자 반려 결과',
    manager,
    row(manager, decline)
      .locator('td')
      .filter({ hasText: /^반려$/ })
  );
  await total(manager, bank.id, 1376.25);
  check('Rejected income leaves balance unchanged');

  const out = '단체출금-' + tag;
  const expense = await createEntry(manager, bank.id, out, 'expense', 26.25);
  const title = '단체 순차결재 ' + tag;
  await Promise.all([
    open('manager', '/approval'),
    open('admin', '/approval'),
    open('staff', '/approval'),
    open('other', '/approval'),
  ]);
  const a = await approval(manager, title, [adminId, manager2Id], expense.id);
  await observation('새 2단계 결재 요청', admin, nameCard(admin, title));
  await observation('2차 결재자도 요청 조회', second, nameCard(second, title));
  await expect(
    nameCard(second, title).getByRole('button', { name: '승인', exact: true })
  ).toHaveCount(0);
  await expect(
    nameCard(manager, title).getByRole('button', { name: '승인', exact: true })
  ).toHaveCount(0);
  assert.equal(
    (await response(second, 'approvals/' + a.id + '/action', 'POST', { action: 'approve' })).status,
    403
  );
  assert.equal(
    (await response(manager, 'approvals/' + a.id + '/action', 'POST', { action: 'approve' }))
      .status,
    403
  );
  assert.equal(
    (await response(admin, 'finance/' + expense.id + '/approve', 'PATCH', { status: 'approved' }))
      .status,
    409
  );
  assert.equal((await response(other, 'approvals/' + a.id)).status, 404);
  assert.equal(
    (await response(staff, 'approvals/' + a.id + '/action', 'POST', { action: 'approve' })).status,
    403
  );
  await expect(button(staff, '결재 요청')).toHaveCount(0);
  const first = await act(admin, a.id, title, '승인', '1차 결재 확인');
  assert.equal(first.status, 'pending');
  await total(manager, bank.id, 1376.25);
  await observation(
    '2차 결재자 활성화',
    second,
    nameCard(second, title).getByRole('button', { name: '승인', exact: true })
  );
  assert.equal(
    (await response(manager, 'approvals/' + a.id, 'PUT', { status: 'cancelled' })).status,
    409
  );
  const last = await act(second, a.id, title, '승인', '최종 승인 확인');
  assert.equal(last.status, 'approved');
  await observation(
    '요청자 최종 승인 내용',
    manager,
    text(nameCard(manager, title), '최종 승인 확인')
  );
  await pdf(manager, 'approval', [title, '1차 결재 확인', '최종 승인 확인', '26.25 USD']);
  assert.equal(
    (await response(second, 'approvals/' + a.id + '/action', 'POST', { action: 'approve' })).status,
    409
  );
  await total(manager, bank.id, 1350);
  check(
    'Assigned order/self approval/role enforcement; first step leaves balance unchanged; final withdrawal deducted once and PDF includes both approvers’ remarks'
  );
  await manager.screenshot({ path: path.join(output, 'approval.png') });

  const declinedTitle = '일반 반려 ' + tag;
  const custom = await approval(manager, declinedTitle, [adminId]);
  await observation('일반 결재 생성', admin, nameCard(admin, declinedTitle));
  const denied = await act(admin, custom.id, declinedTitle, '반려', '증빙 보완 요청');
  assert.equal(denied.status, 'rejected');
  await observation(
    '일반 결재 반려의견',
    manager,
    text(nameCard(manager, declinedTitle), '증빙 보완 요청')
  );
  const cancelTitle = '일반 취소 ' + tag;
  const cancel = await approval(manager, cancelTitle, [adminId]);
  await observation('취소 전 요청 공유', admin, nameCard(admin, cancelTitle));
  await mutation(
    manager,
    'approvals/' + cancel.id,
    'PUT',
    () =>
      nameCard(manager, cancelTitle)
        .getByRole('button', { name: '요청 취소', exact: true })
        .click(),
    200
  );
  await observation('결재 취소 결과', admin, text(nameCard(admin, cancelTitle), '취소'));
  await button(manager, '반려').click();
  await expect(nameCard(manager, declinedTitle)).toBeVisible();
  await expect(nameCard(manager, title)).toHaveCount(0);
  await pdf(
    manager,
    'rejected-filter',
    [declinedTitle, '증빙 보완 요청'],
    [title, cancelTitle, '결재 요청을 취소했습니다.']
  );
  check(
    'Custom rejection, cancellation before first action, filtered approval print and isolated other-company view'
  );
  await open('manager', '/accounts');
  await label(manager, '계좌 필터').selectOption(bank.id);
  await expect(text(nameCard(manager, n), '1,350 USD')).toBeVisible();
  await expect(
    row(manager, out)
      .locator('td')
      .filter({ hasText: /^승인$/ })
  ).toBeVisible();
  await pdf(manager, 'ledger', [
    n,
    '1,350 USD',
    cat,
    out,
    decline,
    '125.75 USD',
    '26.25 USD',
    '반려',
  ]);
  await manager.screenshot({ path: path.join(output, 'ledger.png') });
  await manager.reload();
  await expect(text(nameCard(manager, n), '1,350 USD')).toBeVisible();
  check(
    'Final ledger and PDF contain both actual transactions and correct 1,350 USD balance; balance survives page reload'
  );
  if (mustSync) await checkConcurrentEdits(admin, manager, { ...bank, accountName: n });
  assert.deepEqual(report.pageErrors, []);
  if (mustSync)
    assert.deepEqual(
      report.updates.filter((x) => x.mode !== 'passive'),
      [],
      'All open observer pages should update automatically'
    );
  report.status = 'PASS';
} catch (e) {
  report.error = String(e.stack || e).split('Call log:')[0];
  for (const [role, p] of Object.entries(pages))
    await p.screenshot({ path: path.join(output, 'failure-' + role + '.png') }).catch(() => {});
  throw e;
} finally {
  await writeFile(path.join(output, 'finance.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
