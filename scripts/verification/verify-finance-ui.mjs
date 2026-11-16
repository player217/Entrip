import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const outputDir =
  process.env.VERIFICATION_OUTPUT_DIR ||
  process.env.VERIFICATION_OUTPUT ||
  path.resolve('docs/verification/2026-11-17');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
    : {}),
  args: ['--no-sandbox'],
});
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  status: 'FAIL',
  checks: [],
  pageErrors: [],
};
const pages = [];
const runId = Date.now();
let administrator;
let syntheticUserId;
let failure;
const active = (page) => page.locator('[role="tabpanel"]:visible');
const check = (name) => report.checks.push({ check: name, status: 'PASS' });
const apiResponse = (page, endpoint, method) =>
  page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/${endpoint}` &&
      response.request().method() === method
  );
async function login(role, email, password = 'pass1234') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  pages.push(page);
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('회사 선택').selectOption('entrip');
  await page.getByLabel('역할 선택').selectOption(role);
  if (email) await page.locator('input[name="username"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tablist', { name: '작업 탭' })).toBeVisible();
  return page;
}
async function section(page, label, heading) {
  await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click();
  await expect(active(page).getByRole('heading', { name: heading, exact: true })).toBeVisible();
}
async function refresh(page) {
  const response = apiResponse(page, 'bank-accounts', 'GET');
  await active(page).getByRole('button', { name: '새로고침', exact: true }).click();
  assert.equal((await response).status(), 200);
}
function bankCard(page, name) {
  return active(page)
    .locator('article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
}
function entryRow(page, category) {
  return active(page).locator('tbody tr').filter({ hasText: category });
}
function approvalCard(page, title) {
  return active(page)
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}
async function createEntry(page, accountId, category, type, amount) {
  await active(page).getByRole('button', { name: '거래 등록', exact: true }).click();
  await active(page).getByLabel('계좌', { exact: true }).selectOption(accountId);
  await active(page).getByLabel('입출금 구분', { exact: true }).selectOption(type);
  await active(page).getByLabel('항목', { exact: true }).fill(category);
  await active(page).getByLabel('금액', { exact: true }).fill(String(amount));
  await active(page).getByLabel('거래일', { exact: true }).fill('2026-11-17');
  await active(page).getByLabel('적요', { exact: true }).fill('실제 브라우저 금융 흐름 검증');
  const response = apiResponse(page, 'finance', 'POST');
  await active(page).getByRole('button', { name: '거래 저장', exact: true }).click();
  const created = await response;
  assert.equal(created.status(), 201, await created.text());
  const record = (await created.json()).data;
  await expect(entryRow(page, category)).toBeVisible();
  return record;
}
try {
  administrator = await login('admin');
  const directoryResponse = await administrator.request.get(
    `${baseURL}/api/users?isActive=true&limit=100`
  );
  assert.equal(directoryResponse.status(), 200, await directoryResponse.text());
  const users = (await directoryResponse.json()).data;
  const manager = users.find((user) => user.email === 'manager@entrip.com');
  const manager1 = users.find((user) => user.email === 'manager1@entrip.com');
  assert.ok(manager && manager1, 'Seed must include two distinct Entrip managers');

  await section(administrator, '계좌관리', '계좌 관리');
  await active(administrator).getByRole('button', { name: '계좌 추가', exact: true }).click();
  const accountName = `금융검증-${runId}`;
  for (const [label, value] of [
    ['계좌 이름', accountName],
    ['은행', '검증 은행'],
    ['계좌 번호', `VERIFY-${runId}`],
    ['예금주', '금융 검증'],
    ['통화', 'KRW'],
    ['기초잔액', '10000'],
  ]) {
    await active(administrator).getByLabel(label, { exact: true }).fill(value);
  }
  const bankResponse = apiResponse(administrator, 'bank-accounts', 'POST');
  await active(administrator).getByRole('button', { name: '계좌 저장', exact: true }).click();
  const bankCreated = await bankResponse;
  assert.equal(bankCreated.status(), 201, await bankCreated.text());
  const bank = (await bankCreated.json()).data;
  report.accountId = bank.id;
  await expect(
    bankCard(administrator, accountName).getByText('10,000 KRW', { exact: true })
  ).toBeVisible();

  const category = `검증입금-${runId}`;
  const income = await createEntry(administrator, bank.id, category, 'income', 1000);
  await expect(
    entryRow(administrator, category).getByRole('button', { name: '승인', exact: true })
  ).toHaveCount(0);
  const selfApproval = await administrator.request.patch(
    `${baseURL}/api/finance/${income.id}/approve`,
    { data: { status: 'approved' } }
  );
  assert.equal(selfApproval.status(), 403, await selfApproval.text());
  await expect(
    bankCard(administrator, accountName).getByText('10,000 KRW', { exact: true })
  ).toBeVisible();
  check(
    'Real pending ledger creation does not change balance; self approval hidden and API denied'
  );

  await entryRow(administrator, category)
    .getByRole('button', { name: '수정', exact: true })
    .click();
  await active(administrator).getByLabel('금액', { exact: true }).fill('1500');
  await active(administrator)
    .getByLabel('적요', { exact: true })
    .fill('새로고침 후 동일 거래 수정');
  await administrator.reload();
  await expect(active(administrator).getByLabel('금액', { exact: true })).toHaveValue('1500');
  const editedResponse = apiResponse(administrator, `finance/${income.id}`, 'PUT');
  await active(administrator).getByRole('button', { name: '거래 저장', exact: true }).click();
  const edited = await editedResponse;
  assert.equal(edited.status(), 200, await edited.text());
  assert.equal((await edited.json()).data.id, income.id);
  await expect(
    entryRow(administrator, category).getByText('1,500 KRW', { exact: true })
  ).toBeVisible();
  check('Pending ledger draft survives reload and updates the original transaction with PUT');

  const syntheticEmail = `finance-ui-${runId}@entrip.test`;
  const syntheticPassword = `finance-ui-test-${runId}`;
  const userCreated = await administrator.request.post(`${baseURL}/api/users`, {
    data: {
      email: syntheticEmail,
      password: syntheticPassword,
      name: '금융 검증 관리자',
      role: 'ADMIN',
      department: '검증',
    },
  });
  assert.equal(userCreated.status(), 201, await userCreated.text());
  syntheticUserId = (await userCreated.json()).id;
  const secondAdmin = await login('admin', syntheticEmail, syntheticPassword);
  await section(secondAdmin, '계좌관리', '계좌 관리');
  await active(secondAdmin).getByLabel('계좌 필터', { exact: true }).selectOption(bank.id);
  const approvedResponse = apiResponse(secondAdmin, `finance/${income.id}/approve`, 'PATCH');
  await entryRow(secondAdmin, category).getByRole('button', { name: '승인', exact: true }).click();
  const approved = await approvedResponse;
  assert.equal(approved.status(), 200, await approved.text());
  await expect(entryRow(secondAdmin, category).getByText('승인', { exact: true })).toBeVisible();
  await refresh(administrator);
  await expect(
    bankCard(administrator, accountName).getByText('11,500 KRW', { exact: true })
  ).toBeVisible();
  check('A different administrator approves through UI and persisted balance increases once');

  const expenseCategory = `순차출금-${runId}`;
  const expense = await createEntry(administrator, bank.id, expenseCategory, 'expense', 200);
  await section(administrator, '결재', '결재 관리');
  await active(administrator).getByRole('button', { name: '결재 요청', exact: true }).click();
  const title = `순차 결재 검증-${runId}`;
  await active(administrator).getByLabel('제목', { exact: true }).fill(title);
  await active(administrator)
    .getByLabel('요청 내용', { exact: true })
    .fill('1차 매니저와 2차 매니저의 순차 결재 검증');
  await active(administrator).getByLabel('결재 유형', { exact: true }).selectOption('finance');
  await active(administrator).getByLabel('결재할 거래', { exact: true }).selectOption(expense.id);
  await active(administrator).getByLabel('1차 결재자', { exact: true }).selectOption(manager.id);
  await active(administrator).getByRole('button', { name: '+ 결재자 추가', exact: true }).click();
  await active(administrator).getByLabel('2차 결재자', { exact: true }).selectOption(manager1.id);
  const submittedResponse = apiResponse(administrator, 'approvals', 'POST');
  await active(administrator).getByRole('button', { name: '요청 제출', exact: true }).click();
  const submitted = await submittedResponse;
  assert.equal(submitted.status(), 201, await submitted.text());
  const approval = (await submitted.json()).data;
  report.approvalId = approval.id;
  await expect(approvalCard(administrator, title)).toBeVisible();

  const finalManager = await login('manager', manager1.email);
  await section(finalManager, '결재', '결재 관리');
  await expect(approvalCard(finalManager, title)).toBeVisible();
  await expect(
    approvalCard(finalManager, title).getByRole('button', { name: '승인', exact: true })
  ).toHaveCount(0);
  const outOfOrder = await finalManager.request.post(
    `${baseURL}/api/approvals/${approval.id}/action`,
    { data: { action: 'approve' } }
  );
  assert.equal(outOfOrder.status(), 403, await outOfOrder.text());
  check('Second manager cannot approve before their assigned step, in UI and API');

  const firstManager = await login('manager');
  await section(firstManager, '결재', '결재 관리');
  await approvalCard(firstManager, title)
    .getByLabel('결재 의견', { exact: true })
    .fill('1차 검토 완료');
  const firstActionResponse = apiResponse(firstManager, `approvals/${approval.id}/action`, 'POST');
  await approvalCard(firstManager, title)
    .getByRole('button', { name: '승인', exact: true })
    .click();
  const firstAction = await firstActionResponse;
  assert.equal(firstAction.status(), 200, await firstAction.text());
  assert.equal((await firstAction.json()).data.status, 'pending');
  const interim = await administrator.request.get(`${baseURL}/api/bank-accounts`);
  assert.equal(
    Number((await interim.json()).data.find((item) => item.id === bank.id).balance),
    11500
  );
  const cancelledAfterAction = await administrator.request.put(
    `${baseURL}/api/approvals/${approval.id}`,
    { data: { status: 'cancelled' } }
  );
  assert.equal(cancelledAfterAction.status(), 409);
  check('First approval advances one step, keeps balance unchanged, and blocks late cancellation');

  await active(finalManager).getByRole('button', { name: '새로고침', exact: true }).click();
  await approvalCard(finalManager, title)
    .getByLabel('결재 의견', { exact: true })
    .fill('최종 검토 완료');
  const finalActionResponse = apiResponse(finalManager, `approvals/${approval.id}/action`, 'POST');
  await approvalCard(finalManager, title)
    .getByRole('button', { name: '승인', exact: true })
    .click();
  const finalAction = await finalActionResponse;
  assert.equal(finalAction.status(), 200, await finalAction.text());
  assert.equal((await finalAction.json()).data.status, 'approved');
  await expect(approvalCard(finalManager, title).getByText('승인', { exact: true })).toBeVisible();
  await finalManager.screenshot({
    path: path.join(outputDir, 'finance-sequential-approval.png'),
    fullPage: true,
  });
  await section(administrator, '계좌관리', '계좌 관리');
  await refresh(administrator);
  await expect(
    bankCard(administrator, accountName).getByText('11,300 KRW', { exact: true })
  ).toBeVisible();
  await expect(
    entryRow(administrator, expenseCategory).getByText('승인', { exact: true })
  ).toBeVisible();
  await administrator.reload();
  await expect(
    bankCard(administrator, accountName).getByText('11,300 KRW', { exact: true })
  ).toBeVisible();
  check('Final manager approval persists approved expense and exact balance after full reload');
  await administrator.screenshot({
    path: path.join(outputDir, 'finance-ledger-desktop.png'),
    fullPage: true,
  });
  await administrator.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await administrator.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    'Financial page must fit mobile viewport'
  );
  await administrator.screenshot({
    path: path.join(outputDir, 'finance-ledger-mobile.png'),
    fullPage: true,
  });
  check('Real finance ledger fits 390px viewport');
  assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} catch (error) {
  failure = error;
  report.error = error.stack || String(error);
  for (const [index, page] of pages.entries())
    await page
      .screenshot({ path: path.join(outputDir, `finance-failure-${index}.png`), fullPage: true })
      .catch(() => {});
} finally {
  if (administrator && syntheticUserId) {
    try {
      const response = await administrator.request.delete(
        `${baseURL}/api/users/${syntheticUserId}`
      );
      assert.equal(response.status(), 204, await response.text());
      report.cleanup = 'Synthetic test administrator deactivated';
    } catch (error) {
      report.cleanupError = String(error);
      report.status = 'FAIL';
      failure ||= error;
    }
  }
  await writeFile(path.join(outputDir, 'finance-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
if (failure) throw failure;
