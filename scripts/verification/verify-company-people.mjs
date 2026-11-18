// All writes are restricted to a disposable Entrip deployment and synthetic accounts.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
assert.equal(process.env.QA_DISPOSABLE || process.env.LAN_SMOKE_DISPOSABLE, '1', 'Use a disposable deployment');
const base = new URL(process.env.BASE_URL);
const out = path.resolve(process.env.VERIFICATION_OUTPUT_DIR || 'company-people-verification');
await mkdir(out, { recursive: true });
const args = ['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server'];
if (process.env.ENTRIP_VERIFY_HOST_MAP === 'loopback')
  args.push(`--host-resolver-rules=MAP ${base.hostname} 127.0.0.1`);
const browser = await chromium.launch({
  args,
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
});
const report = {
  status: 'FAIL',
  pageErrors: [],
  checks: [],
  screens: [],
  pdfs: [],
  unavailable: ['채팅 파일 첨부', '메시지 이모지 반응', '직원 온라인 상태 수동 설정'],
};
const run = Date.now().toString(36);
const employeeEmail = `staff-${run}@entrip-qa.example`;
const secret = randomBytes(22).toString('hex');
const strictLive = process.env.QA_REQUIRE_LIVE === '1';
const liveWindow = Number(process.env.QA_LIVE_TIMEOUT_MS || 8000);
const agency = process.env.QA_COMPANY;
let admin, createdId;
const observations = [];
function note(name, values = {}) {
  report.checks.push({ name, ...values });
}
function noPasswordFields(data) {
  if (!data || typeof data !== 'object') return;
  for (const [key, value] of Object.entries(data)) {
    assert.ok(!/password|credentialHash/i.test(key), 'A staff response exposed a password field');
    noPasswordFields(value);
  }
}
async function screenshot(page, id) {
  await page.screenshot({ path: path.join(out, id + '.png'), animations: 'disabled' });
  report.screens.push(id + '.png');
}
async function printView(page, id, expected = [], excluded = []) {
  await page.emulateMedia({ media: 'print' });
  try {
    const visible = await page.locator('body').innerText();
    for (const value of expected) assert.ok(visible.includes(value), '출력에 필요한 항목이 없습니다: ' + value);
    for (const value of excluded) assert.ok(!visible.includes(value), '출력에 제외할 항목이 들어 있습니다');
    await page.pdf({
      path: path.join(out, id + '.pdf'),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    report.pdfs.push(id + '.pdf');
  } finally {
    await page.emulateMedia({ media: 'screen' });
  }
}
async function login(email, pass, company, savedAccount) {
  assert.ok(email && pass && company, 'Missing synthetic account environment');
  const storageState =
    savedAccount && process.env.QA_STATE_DIR
      ? path.join(process.env.QA_STATE_DIR, savedAccount + '.json')
      : undefined;
  const ctx = await browser.newContext({
    baseURL: base.origin,
    viewport: { width: 1440, height: 910 },
    storageState,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  if (storageState) {
    await page.goto('/settings');
    const current = await identity(page);
    assert.equal(current.id, process.env['QA_' + savedAccount.toUpperCase() + '_ID']);
    assert.equal(current.companyCode, company);
    return page;
  }
  await page.goto('/login');
  await page.locator('[name=companyCode]').fill(company);
  await page.locator('[name=username]').fill(email);
  await page.locator('[name=password]').fill(pass);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/v2/auth/login') && r.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  assert.equal((await response).status(), 200);
  await page.waitForURL((u) => u.pathname === '/');
  return page;
}
async function identity(page) {
  // The same browser cookies remain available while revocation navigates the page to login.
  const response = await page.request.get('/api/v2/auth/me');
  const status = response.status();
  if (!response.ok()) return { status };
  const data = await response.json();
  const { id, name, role, companyCode } = data.data?.user ?? data.user;
  return { status, id, name, role, companyCode };
}
async function staffSettings(page) {
  await page.goto('/settings');
  await page.getByRole('region', { name: '직원 목록 표' }).waitFor();
}
function staffRow(page) {
  return page.getByRole('row').filter({ hasText: employeeEmail });
}
async function staffAction(name, update) {
  const add = name === '직원 추가';
  if (add) await admin.getByRole('button', { name, exact: true }).click();
  else await staffRow(admin).getByRole('button', { name: '편집', exact: true }).click();
  const dialog = admin.getByRole('dialog', { name, exact: true });
  await update(dialog);
  const received = admin.waitForResponse(
    (r) =>
      r.url().endsWith('/api/v2/users' + (add ? '' : '/' + createdId)) &&
      r.request().method() === (add ? 'POST' : 'PUT')
  );
  await dialog.getByRole('button', { name: '저장', exact: true }).click();
  const response = await received;
  assert.equal(response.status(), add ? 201 : 200);
  const data = await response.json();
  noPasswordFields(data);
  await dialog.waitFor({ state: 'hidden' });
  return data;
}
async function reflect(name, predicate, fallback, required = true) {
  const start = Date.now();
  let mode = 'automatic';
  try {
    await expect.poll(predicate, { timeout: liveWindow, intervals: [80, 160, 300] }).toBe(true);
  } catch {
    mode = 'after-refresh';
    await fallback();
    await expect.poll(predicate, { timeout: 10000 }).toBe(true);
    if (required) observations.push(name);
  }
  note(name, { mode, elapsedMs: Date.now() - start });
}
async function chat(page) {
  await page.goto('/chat');
  const section = page.getByRole('region', { name: '업무 메신저' });
  await section.getByText('실시간 연결됨', { exact: true }).waitFor();
  return section;
}
const search = (section) => section.getByLabel('대화 또는 직원 검색');
const thread = (section) => section.getByRole('region', { name: '대화 메시지' });
const msg = (section, txt) =>
  thread(section)
    .locator('[data-message-id]')
    .filter({ has: section.page().getByText(txt, { exact: true }) });
const room = (section, name) => section.locator('aside button').filter({ hasText: name }).first();
async function contact(section, email, invite = false) {
  await section
    .getByRole('button', { name: invite ? '직원 초대' : '조직도', exact: true })
    .last()
    .click();
  await search(section).fill(email);
  const person = section.locator('aside').getByText(email, { exact: false }).locator('../..');
  await person.getByRole('button', { name: invite ? '초대' : '1:1 대화', exact: true }).click();
  await search(section).fill('');
}
async function send(section, text, enter = false) {
  const input = section.getByRole('textbox', { name: '메시지', exact: true });
  await input.fill(text);
  if (enter) await input.press('Enter');
  else await section.getByRole('button', { name: '전송', exact: true }).click();
  await msg(section, text).waitFor();
}
async function liveText(name, section, text, start) {
  await msg(section, text).waitFor({ timeout: 8500 });
  note(name, { mode: 'automatic', elapsedMs: Date.now() - start });
}
async function verifyHistory(page, tag) {
  const section = await chat(page);
  const last = '이전대화 ' + tag + ' 51';
  const previous = '초대 직원 회신 ' + tag;
  await room(section, last).click();
  await msg(section, last).waitFor();
  assert.equal(await thread(section).locator('[data-message-id]').count(), 50);
  assert.equal(await msg(section, previous).count(), 0);
  await section.getByRole('button', { name: '이전 메시지', exact: true }).click();
  await msg(section, previous).waitFor();
  await msg(section, '세 계정 공유 ' + tag).waitFor();
  await section.getByText('처음 메시지까지 확인했습니다.').waitFor();
  const messageIds = await thread(section)
    .locator('[data-message-id]')
    .evaluateAll((rows) => rows.map((row) => row.dataset.messageId));
  assert.equal(new Set(messageIds).size, messageIds.length);
  await screenshot(page, 'loaded-history');
  note('다른 계정의 51회 UI 전송 후 최근 50건과 이전 이력을 중복 없이 연결', { messages: messageIds.length });
}
try {
  const manager = await login(process.env.QA_MANAGER_EMAIL, process.env.QA_MANAGER_PASSWORD, agency, 'manager');
  if (process.env.QA_RESUME_CHAT_HISTORY) {
    await verifyHistory(manager, process.env.QA_RESUME_CHAT_HISTORY);
  } else {
    const staff = await login(process.env.QA_STAFF_EMAIL, process.env.QA_STAFF_PASSWORD, agency, 'staff');
    const other = await login(
      process.env.QA_OTHER_EMAIL,
      process.env.QA_OTHER_PASSWORD,
      process.env.QA_OTHER_COMPANY,
      'other'
    );
    admin = await login(process.env.QA_ADMIN_EMAIL, process.env.QA_ADMIN_PASSWORD, agency, 'admin');
    const ids = await Promise.all([admin, manager, staff, other].map(identity));
    assert.equal(new Set(ids.map((x) => x.id)).size, 4);
    assert.deepEqual(
      ids.slice(0, 3).map((x) => x.companyCode),
      [agency, agency, agency]
    );
    assert.notEqual(ids[3].companyCode, agency);
    note('동일 회사 관리자·매니저·직원 및 별도 회사 계정 각각 독립 로그인');
    await Promise.all([admin, manager, staff, other].map(staffSettings));
    assert.equal(await manager.getByRole('button', { name: '직원 추가', exact: true }).count(), 0);
    assert.equal(await staff.getByRole('button', { name: '직원 추가', exact: true }).count(), 0);
    note('매니저·일반 직원 명부는 조회 전용');
    const orgPage = await staff.context().newPage();
    const org = await chat(orgPage);
    await org.getByRole('button', { name: '조직도', exact: true }).click();
    await search(org).fill(employeeEmail);
    const listedEmployee = org.locator('aside').getByText(employeeEmail, { exact: false });
    const reloadDirectory = () => org.getByRole('button', { name: '조직도', exact: true }).click();
    const created = await staffAction('직원 추가', async (d) => {
      await d.getByLabel('이름', { exact: true }).fill('연동검증 신규직원');
      await d.getByLabel('이메일', { exact: true }).fill(employeeEmail);
      await d.getByLabel('부서', { exact: true }).fill('여행운영검증팀');
      await d.getByLabel('초기 비밀번호', { exact: true }).fill(secret);
      await printView(
        admin,
        'employee-draft',
        ['신규 직원', employeeEmail, '여행운영검증팀'],
        [secret, '초기 비밀번호']
      );
    });
    createdId = created.id;
    await reflect(
      '직원 등록이 이미 열린 타 직원 명부에 표시',
      () => staffRow(manager).isVisible(),
      () => manager.getByRole('button', { name: '새로고침', exact: true }).click()
    );
    await reflect(
      '직원 등록이 열려 있는 메신저 조직도 검색에 반영',
      () => listedEmployee.isVisible(),
      reloadDirectory
    );
    await manager.getByLabel('직원 검색').fill(employeeEmail);
    await expect(staffRow(manager)).toContainText('여행운영검증팀');
    await other.getByLabel('직원 검색').fill(employeeEmail);
    await expect(other.getByRole('row').filter({ hasText: employeeEmail })).toHaveCount(0);
    const temp = await login(employeeEmail, secret, agency);
    await staffSettings(temp);
    await staffAction('직원 편집', async (d) => {
      await d.getByLabel('이름', { exact: true }).fill('연동검증 변경직원');
      await d.getByLabel('부서', { exact: true }).fill('변경 예약팀');
      await d.getByLabel('권한', { exact: true }).selectOption('ADMIN');
    });
    await reflect(
      '이름·부서·권한 변경을 타 계정 명부에서 확인',
      async () =>
        (await staffRow(manager).innerText()).includes('변경 예약팀') &&
        (await staffRow(manager).innerText()).includes('관리자'),
      () => manager.getByRole('button', { name: '새로고침', exact: true }).click()
    );
    await reflect(
      '기존 직원 세션 승격 후 관리자 작업 활성화',
      () => temp.getByRole('button', { name: '직원 추가', exact: true }).isVisible(),
      () => temp.reload()
    );
    assert.equal((await identity(temp)).role, 'ADMIN');
    await screenshot(manager, 'colleague-employee');
    await printView(
      manager,
      'filtered-staff',
      ['직원 명부', '조회 1명', '연동검증 변경직원', '변경 예약팀'],
      [process.env.QA_OTHER_EMAIL, secret]
    );
    await reflect(
      '열린 조직도에 변경된 직원 이름·부서 반영',
      async () => (await listedEmployee.innerText()).includes('변경 예약팀'),
      reloadDirectory
    );
    await printView(
      orgPage,
      'filtered-messenger-directory',
      ['조직도', employeeEmail, '연동검증 변경직원', '변경 예약팀'],
      [process.env.QA_OTHER_EMAIL]
    );
    const receivedStaff = await manager.evaluate(async () =>
      (await fetch('/api/v2/users?isActive=true&limit=100')).json()
    );
    assert.ok(receivedStaff.data.some((u) => u.id === createdId));
    noPasswordFields(receivedStaff);
    note('명부·조직도 조회 범위 인쇄, 비밀번호 필드 생략');
    await temp.getByRole('button', { name: '직원 추가', exact: true }).click();
    const pendingForm = temp.getByRole('dialog', { name: '직원 추가', exact: true });
    await pendingForm.getByLabel('이름', { exact: true }).fill('저장 전 작성중');
    await staffAction('직원 편집', (d) => d.getByLabel('부서', { exact: true }).fill('수정된 지원팀'));
    await reflect(
      '조직도에 열린 직원의 부서 변경 자동 반영',
      async () => (await listedEmployee.innerText()).includes('수정된 지원팀'),
      reloadDirectory
    );
    await expect(pendingForm.getByLabel('이름', { exact: true })).toHaveValue('저장 전 작성중');
    await pendingForm.getByRole('button', { name: '취소', exact: true }).click();
    note('다른 직원의 저장 중 이미 입력한 관리자 폼 유지');
    await staffAction('직원 편집', (d) => d.getByLabel('권한', { exact: true }).selectOption('USER'));
    await reflect(
      '기존 관리자 세션 강등 후 변경 작업 숨김',
      async () => !(await temp.getByRole('button', { name: '직원 추가', exact: true }).isVisible()),
      () => temp.reload()
    );
    assert.equal((await identity(temp)).role, 'USER');
    admin.once('dialog', (d) => d.accept());
    await staffRow(admin).getByRole('button', { name: '비활성화', exact: true }).click();
    await staffRow(admin).getByText('비활성', { exact: true }).waitFor();
    assert.equal((await identity(temp)).status, 401);
    await reflect(
      '비활성 직원이 기존 조직도 검색에서 제거',
      async () => !(await listedEmployee.isVisible()),
      reloadDirectory
    );
    await reflect(
      '비활성 직원 타 직원 명부에서 제거',
      async () => !(await staffRow(manager).isVisible()),
      () => manager.getByRole('button', { name: '새로고침', exact: true }).click()
    );
    try {
      await reflect(
        '비활성화된 직원의 열린 화면 로그인으로 복귀',
        async () => new URL(temp.url()).pathname === '/login',
        () => temp.reload()
      );
    } catch (error) {
      if (strictLive) throw error;
      note('비활성화된 직원의 열린 화면 로그인으로 복귀', {
        mode: 'failed-after-refresh',
        pathname: new URL(temp.url()).pathname,
      });
    }
    note('비활성 계정 기존 쿠키로 현재 사용자 재요청 시 401');
    const denied = await temp.evaluate(
      async ({ email, pass, companyCode }) =>
        (
          await fetch('/api/v2/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass, companyCode }),
          })
        ).status,
      { email: employeeEmail, pass: secret, companyCode: agency }
    );
    assert.equal(denied, 401);
    admin.once('dialog', (d) => d.accept());
    await staffRow(admin).getByRole('button', { name: '재활성화', exact: true }).click();
    await staffRow(admin).getByText('활성', { exact: true }).waitFor();
    await reflect(
      '재활성화된 직원 타 직원 명부에 복귀',
      () => staffRow(manager).isVisible(),
      () => manager.getByRole('button', { name: '새로고침', exact: true }).click()
    );
    await reflect('재활성화 직원 기존 조직도 검색에 복귀', () => listedEmployee.isVisible(), reloadDirectory);
    await orgPage.close();
    const restored = await login(employeeEmail, secret, agency);
    assert.equal((await identity(restored)).id, createdId);
    note('재활성화 후 같은 ID와 기존 비밀번호로 재로그인');
    await restored.context().close();
    await temp.context().close();
    const [a, b, c, x] = await Promise.all([admin, manager, staff, other].map(chat));
    await x.getByRole('button', { name: '조직도', exact: true }).click();
    await search(x).fill(process.env.QA_ADMIN_EMAIL);
    await x.getByText('검색 조건에 맞는 직원이 없습니다.', { exact: true }).waitFor();
    note('별도 회사 명부와 조직도에서 다른 회사 직원 검색 결과 0');
    await contact(a, process.env.QA_MANAGER_EMAIL);
    const line = '대화 연동 ' + run;
    let start = Date.now();
    await send(a, line, true);
    const bRoom = room(b, line);
    await bRoom.waitFor({ timeout: 8500 });
    await expect(bRoom.locator('span.rounded-full.bg-blue-600')).toHaveText('1');
    await expect(room(c, line)).toHaveCount(0);
    note('같은 회사라도 초대 전 1:1 대화가 세 번째 직원 목록에 표시되지 않음');
    note('직접 대화 생성·Enter 전송·타 계정 새 대화 및 안 읽음 표시', {
      mode: 'automatic',
      elapsedMs: Date.now() - start,
    });
    await bRoom.click();
    await msg(b, line).waitFor();
    await expect(bRoom.locator('span.rounded-full.bg-blue-600')).toHaveCount(0);
    const input = a.getByLabel('메시지', { exact: true });
    await input.fill('작성중 검사');
    await b.getByText('입력 중…', { exact: false }).waitFor({ timeout: 3500 });
    await input.fill('');
    note('대화 선택 후 안 읽음 해제·상대방 입력 중 표시');
    const reply = '답신 ' + run + '\n둘째 줄';
    const bInput = b.getByLabel('메시지', { exact: true });
    await bInput.fill('답신 ' + run);
    await bInput.press('Shift+Enter');
    await expect(bInput).toHaveValue('답신 ' + run + '\n');
    // Fill the complete multiline value for IME-independent text delivery.
    await bInput.fill(reply);
    start = Date.now();
    await bInput.press('Enter');
    await liveText('직원 답신·여러 줄 본문 전달', a, reply, start);
    const revised = '수정 본문 ' + run;
    admin.once('dialog', (d) => d.accept(revised));
    start = Date.now();
    await msg(a, line).getByRole('button', { name: '수정', exact: true }).click();
    await liveText('메시지 수정이 상대 대화에 반영', b, revised, start);
    await expect(msg(b, revised)).toContainText('수정됨');
    await expect(msg(b, revised).getByRole('button', { name: '삭제', exact: true })).toHaveCount(0);
    admin.once('dialog', (d) => d.accept());
    start = Date.now();
    await msg(a, revised).getByRole('button', { name: '삭제', exact: true }).click();
    await b
      .getByRole('region', { name: '대화 메시지' })
      .getByText('삭제된 메시지입니다.', { exact: true })
      .last()
      .waitFor({ timeout: 8500 });
    await expect(msg(b, revised)).toHaveCount(0);
    note('메시지 삭제 동기화 및 상대 계정 타인 메시지 수정·삭제 제어 없음', {
      mode: 'automatic',
      elapsedMs: Date.now() - start,
    });
    await contact(a, process.env.QA_STAFF_EMAIL, true);
    await a.getByText('참여자 3명', { exact: true }).waitFor();
    await b.getByText('참여자 3명', { exact: true }).waitFor({ timeout: 8500 });
    const group = '세 계정 공유 ' + run;
    start = Date.now();
    await send(a, group);
    await room(c, group).click();
    await liveText('그룹 초대 후 세 번째 직원의 대화 참여', c, group, start);
    await msg(b, group).waitFor();
    await msg(c, reply).waitFor();
    const replyC = '초대 직원 회신 ' + run;
    start = Date.now();
    await send(c, replyC);
    await liveText('그룹 직원 회신이 관리자 및 다른 직원에 전달', b, replyC, start);
    await msg(a, replyC).waitFor();
    await expect(room(b, replyC).locator('span.rounded-full.bg-blue-600')).toHaveCount(0, { timeout: 8500 });
    note('열린 대화에서 받은 새 회신 읽음 반영');
    await screenshot(b, 'group-conversation');
    await printView(
      manager,
      'group-conversation',
      ['참여자 3명', '삭제된 메시지입니다.', group, replyC],
      [revised, process.env.QA_OTHER_EMAIL]
    );
    await search(b).fill(ids[0].name);
    await expect(room(b, replyC)).toBeVisible();
    await search(b).fill('존재하지않는' + run);
    await b.getByText('검색 조건에 맞는 대화가 없습니다.', { exact: true }).waitFor();
    await search(b).fill('');
    note('대화명·직원 검색, 그룹에서 소속된 대화 이력 조회');
    await x.getByRole('button', { name: '대화', exact: true }).click();
    await search(x).fill('');
    await expect(room(x, replyC)).toHaveCount(0);
    await screenshot(x, 'other-company-chat');
    await manager.reload();
    const reloaded = manager.getByRole('region', { name: '업무 메신저' });
    await room(reloaded, replyC).click();
    await msg(reloaded, replyC).waitFor();
    await msg(reloaded, group).waitFor();
    note('독립 세션 새로고침 뒤 그룹 이력 및 삭제 상태 보존, 다른 회사에 그룹 미표시');
    await msg(reloaded, '삭제된 메시지입니다.').first().waitFor();
    if (process.env.QA_CHAT_HISTORY === '1') {
      // Build history through the same compose control the user works with.
      let last;
      for (let index = 1; index <= 51; index++) {
        last = '이전대화 ' + run + ' ' + String(index).padStart(2, '0');
        await send(a, last, true);
        await new Promise((resolve) => setTimeout(resolve, 1900));
      }
      await msg(reloaded, last).waitFor();
      await verifyHistory(manager, run);
    }
  }
  assert.deepEqual(report.pageErrors, []);
  if (strictLive) assert.deepEqual(observations, [], 'Required cross-account updates needed manual refresh');
  report.status = 'PASS';
} catch (error) {
  report.error = String(error.message).replaceAll(secret, '[redacted]');
  process.exitCode = 1;
} finally {
  if (createdId && admin)
    await admin
      .evaluate(async (id) => (await fetch('/api/v2/users/' + id, { method: 'DELETE' })).status, createdId)
      .catch(() => {});
  await writeFile(path.join(out, 'people-and-chat.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks.length,
      requiredRefresh: observations,
      error: report.error,
    })
  );
}
