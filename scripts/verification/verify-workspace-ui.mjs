import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const outputDir = process.env.VERIFICATION_OUTPUT_DIR || path.resolve('docs/verification/2026-11-17');
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}), args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
let dismissNextDialog = false;
const dialogs = [];
page.on('dialog', async dialog => {
  dialogs.push({ type: dialog.type(), message: dialog.message(), dismissed: dismissNextDialog });
  if (dismissNextDialog) { dismissNextDialog = false; await dialog.dismiss(); }
  else await dialog.accept();
});
const results = [];
let failure;
const activePane = () => page.locator('[role="tabpanel"]:visible');
try {
  await page.goto(`${baseURL}/login`);
  await page.getByLabel('회사 선택').selectOption(process.env.TEST_COMPANY || 'entrip');
  await page.getByLabel('역할 선택').selectOption('admin');
  if (process.env.TEST_EMAIL) await page.locator('input[name="username"]').fill(process.env.TEST_EMAIL);
  if (process.env.TEST_PASSWORD) await page.locator('input[name="password"]').fill(process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('tablist', { name: '작업 탭' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('navigation').getByRole('button', { name: '계좌관리', exact: true }).click();
  await expect(activePane().getByRole('heading', { name: '계좌 관리', exact: true })).toBeVisible({ timeout: 30000 });
  await activePane().getByRole('button', { name: '계좌 추가', exact: true }).click();
  await activePane().getByLabel('계좌 이름', { exact: true }).fill('탭 A 보관 초안');
  await activePane().getByLabel('은행', { exact: true }).fill('탭 A 은행');
  const tabA = await page.getByRole('tab', { selected: true }).getAttribute('id');
  await page.getByRole('button', { name: '새 작업 탭', exact: true }).click();
  await activePane().getByRole('button', { name: '계좌관리', exact: true }).click();
  await activePane().getByRole('button', { name: '계좌 추가', exact: true }).click();
  await activePane().getByLabel('계좌 이름', { exact: true }).fill('탭 B 보관 초안');
  const tabB = await page.getByRole('tab', { selected: true }).getAttribute('id');
  assert.notEqual(tabA, tabB);
  await page.locator(`[id="${tabA}"]`).click();
  await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue('탭 A 보관 초안');
  await expect(activePane().getByLabel('은행', { exact: true })).toHaveValue('탭 A 은행');
  results.push({ check: 'independent mounted drafts', status: 'PASS' });

  dismissNextDialog = true;
  await page.locator(`[id="${tabA}"]`).locator('..').getByRole('button', { name: '계좌관리 탭 닫기' }).click();
  await expect(page.locator(`[id="${tabA}"]`)).toBeVisible();
  assert.equal(dialogs.at(-1)?.dismissed, true);
  assert.match(dialogs.at(-1)?.message || '', /저장하지 않은/);
  await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue('탭 A 보관 초안');
  results.push({ check: 'dirty close cancellation', status: 'PASS' });

  await page.locator(`[id="${tabB}"]`).click();
  await page.locator(`[id="${tabB}"]`).press('Alt+ArrowLeft');
  await expect(page.getByRole('tab').first()).toHaveAttribute('id', tabB);
  await expect(page.locator(`[id="${tabB}"]`)).toHaveAttribute('aria-selected', 'true');
  results.push({ check: 'keyboard tab reorder', status: 'PASS' });

  await page.reload();
  await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue('탭 B 보관 초안', { timeout: 30000 });
  await page.locator(`[id="${tabA}"]`).click();
  await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue('탭 A 보관 초안');
  results.push({ check: 'drafts and tab identity after reload', status: 'PASS' });

  // Real bank account CRUD, including the editing ID after a full document reload.
  await activePane().getByRole('button', { name: '취소', exact: true }).click();
  await activePane().getByRole('button', { name: '계좌 추가', exact: true }).click();
  const accountName = `브라우저검증-${Date.now()}`;
  for (const [label, value] of [['계좌 이름', accountName], ['은행', '검증 은행'], ['계좌 번호', 'UI-0001'], ['예금주', '검증 담당자'], ['통화', 'KRW'], ['기초잔액', '1234']]) {
    await activePane().getByLabel(label, { exact: true }).fill(value);
  }
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/bank-accounts') && response.request().method() === 'POST');
  await activePane().getByRole('button', { name: '계좌 저장', exact: true }).click();
  const created = await createdResponse;
  assert.equal(created.status(), 201, await created.text());
  const account = (await created.json()).data;
  assert.ok(account.id);
  await expect(activePane().getByRole('heading', { name: accountName, exact: true })).toBeVisible();
  await activePane().locator('article').filter({ has: page.getByRole('heading', { name: accountName, exact: true }) }).getByRole('button', { name: '수정', exact: true }).click();
  await activePane().getByLabel('계좌 이름', { exact: true }).fill(`${accountName}-수정`);
  await page.reload();
  await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue(`${accountName}-수정`, { timeout: 30000 });
  const updatedResponse = page.waitForResponse(response => response.url().endsWith(`/api/bank-accounts/${account.id}`) && response.request().method() === 'PUT');
  await activePane().getByRole('button', { name: '계좌 저장', exact: true }).click();
  const updated = await updatedResponse;
  assert.equal(updated.status(), 200, await updated.text());
  assert.equal((await updated.json()).data.id, account.id);
  await expect(activePane().getByRole('heading', { name: `${accountName}-수정`, exact: true })).toBeVisible();
  results.push({ check: 'real bank create and edit-after-reload PUT', status: 'PASS', accountId: account.id });
  await activePane().locator('article').filter({ has: page.getByRole('heading', { name: `${accountName}-수정`, exact: true }) }).getByRole('button', { name: '수정', exact: true }).click();
  const deletedResponse = page.waitForResponse(response => response.url().endsWith(`/api/bank-accounts/${account.id}`) && response.request().method() === 'DELETE');
  await activePane().getByRole('button', { name: '계좌 삭제', exact: true }).click();
  assert.equal((await deletedResponse).status(), 204);
  await expect(activePane().getByRole('heading', { name: `${accountName}-수정`, exact: true })).toHaveCount(0);
  results.push({ check: 'real bank delete', status: 'PASS' });
  await activePane().getByRole('button', { name: '계좌 추가', exact: true }).click();
  await activePane().getByLabel('계좌 이름', { exact: true }).fill('탭 A 보관 초안');

  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(activePane().getByLabel('계좌 이름', { exact: true })).toBeVisible();
    const bounds = await page.evaluate(() => {
      const main = document.querySelector('main').getBoundingClientRect();
      const header = document.querySelector('header').getBoundingClientRect();
      return { viewport: innerWidth, page: document.documentElement.scrollWidth, mainLeft: main.left, mainRight: main.right, headerRight: header.right };
    });
    assert.ok(bounds.page <= bounds.viewport + 1, `page overflow at ${width}: ${JSON.stringify(bounds)}`);
    assert.ok(bounds.mainLeft >= 0 && bounds.mainRight <= width + 1 && bounds.headerRight <= width + 1, JSON.stringify(bounds));
    if (width === 390) {
      await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
      await expect(page.getByRole('complementary', { name: '주 메뉴' })).toBeVisible();
      await page.getByRole('navigation').getByRole('button', { name: '계좌관리', exact: true }).click();
      await expect(page.getByRole('complementary', { name: '주 메뉴' })).toBeHidden();
      await expect(activePane().getByLabel('계좌 이름', { exact: true })).toHaveValue('탭 A 보관 초안');
    }
    await page.screenshot({ path: path.join(outputDir, `workspace-${width}.png`), fullPage: true });
    results.push({ check: `viewport ${width}`, status: 'PASS', bounds });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await activePane().getByRole('button', { name: '취소', exact: true }).click();
  await page.getByRole('navigation').getByRole('button', { name: '결재', exact: true }).click();
  await expect(activePane().getByRole('heading', { name: '결재 관리', exact: true })).toBeVisible();
  await activePane().getByRole('button', { name: '결재 요청', exact: true }).click();
  const approvalTitle = `브라우저 결재-${Date.now()}`;
  await activePane().getByLabel('제목', { exact: true }).fill(approvalTitle);
  await activePane().getByLabel('요청 내용', { exact: true }).fill('실제 화면에서 생성하고 취소하는 결재 검증');
  const approver = activePane().getByLabel('1차 결재자', { exact: true });
  await expect.poll(() => approver.locator('option').count()).toBeGreaterThan(1);
  await approver.selectOption({ index: 1 });
  const approvalResponse = page.waitForResponse(response => response.url().endsWith('/api/approvals') && response.request().method() === 'POST');
  await activePane().getByRole('button', { name: '요청 제출', exact: true }).click();
  const requested = await approvalResponse;
  assert.equal(requested.status(), 201, await requested.text());
  const approval = (await requested.json()).data;
  assert.ok(approval.id);
  const card = activePane().locator('article').filter({ has: page.getByRole('heading', { name: approvalTitle, exact: true }) });
  await expect(card).toBeVisible();
  const cancelledResponse = page.waitForResponse(response => response.url().endsWith(`/api/approvals/${approval.id}`) && response.request().method() === 'PUT');
  await card.getByRole('button', { name: '요청 취소', exact: true }).click();
  assert.equal((await cancelledResponse).status(), 200);
  await expect(card.getByText('취소', { exact: true })).toBeVisible();
  results.push({ check: 'real approval request and cancellation', status: 'PASS', approvalId: approval.id });
  assert.deepEqual(pageErrors, []);
} catch (error) {
  failure = error;
  await page.screenshot({ path: path.join(outputDir, 'workspace-failure.png'), fullPage: true }).catch(() => {});
} finally {
  const report = { checkedAt: new Date().toISOString(), baseURL, status: failure ? 'FAIL' : 'PASS', results, pageErrors, dialogs, ...(failure ? { error: String(failure.stack || failure) } : {}) };
  await writeFile(path.join(outputDir, 'workspace-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
if (failure) throw failure;
