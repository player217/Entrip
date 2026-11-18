import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const out = process.env.VERIFICATION_OUTPUT || path.resolve('docs/verification/2026-11-17/visual-fixes');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); page.setDefaultTimeout(12000);
const report = { startedAt: new Date().toISOString(), status: 'RUNNING', checks: [], screenshots: [], pageErrors: [], fixtures: ['Stored PUS timetable for presentation only; no live availability assertion.'] };
page.on('pageerror', e => report.pageErrors.push(e.message));
page.on('dialog', d => d.dismiss());
const pane = () => page.locator('[role="tabpanel"]:visible');
async function shot(name, target=page) { await page.waitForTimeout(name.includes('stats')?1800:250); const file=name+'.png'; await target.screenshot({path:path.join(out,file),fullPage:true}); report.screenshots.push(file); }
async function check(name, run) { try { const details=await run(); report.checks.push({name,status:'PASS',...(details?{details}:{})}); } catch(e) { report.checks.push({name,status:'FAIL',error:e.stack}); await shot('failure-'+report.checks.length).catch(()=>{}); } await fs.writeFile(path.join(out,'visual-fixes-report.json'),JSON.stringify(report,null,2)); }
async function login(role='admin') { await page.goto('/login'); await page.getByLabel('회사 선택').selectOption('entrip'); await page.getByLabel('역할 선택').selectOption(role); await page.getByRole('button',{name:'로그인',exact:true}).click(); await page.getByRole('tablist',{name:'작업 탭'}).waitFor(); }
try {
 await login();
 await check('V01/V05/V06: all four booking toolbars fit mobile; agenda is readable',async()=>{
  await page.setViewportSize({width:390,height:844}); const bounds=[];
  for(const [route,name] of [['/calendar-monthly','month-calendar'],['/calendar-weekly','week-calendar'],['/list-monthly','month-list'],['/list-weekly','week-list']]) {
   await page.goto(route); const search=pane().getByLabel('예약 검색',{exact:true});await search.waitFor();await search.fill('');
   const box=await search.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390,JSON.stringify(box));bounds.push({route,...box});
   if(name.includes('calendar')) { const agenda=pane().getByRole('region',{name:'선택한 날짜의 예약'});await agenda.waitFor();await agenda.scrollIntoViewIfNeeded();await expect(agenda).toContainText('ENTRIP Team'); }
   await shot('01-mobile-'+name);
  }
  return bounds;
 });
 await check('V12/V20: search no-match differs from outage and outage retry recovers',async()=>{
  await page.goto('/list-monthly');await pane().getByLabel('예약 검색',{exact:true}).fill('NO_MATCH_VISUAL_FIX');await expect(pane()).toContainText('검색 조건');await shot('02-empty-search');await pane().getByLabel('예약 검색',{exact:true}).fill('');
  await page.route('**/api/v2/bookings?*',r=>r.fulfill({status:503,json:{message:'시각 재검증 연결 오류'}}));await page.reload();await pane().getByRole('alert').waitFor();await expect(pane()).not.toContainText('해당 기간에 예약이 없습니다.');await expect(pane()).not.toContainText('예약 0건');await shot('03-booking-error');await page.unroute('**/api/v2/bookings?*');await pane().getByRole('button',{name:'다시 시도',exact:true}).click();await pane().getByRole('alert').waitFor({state:'hidden'});await shot('04-booking-recovered');
 });
 await check('V08/V09: Korean history fields and print column layout',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/list-monthly');const row=pane().locator('tbody tr').filter({hasText:'예약 UI 검증'}).first();await row.getByRole('button').click();const editor=page.getByRole('dialog',{name:'예약 수정',exact:true});await editor.getByRole('button',{name:'변경 이력',exact:true}).click();const history=editor.getByRole('heading',{name:'저장된 변경 이력'}).locator('..');await history.scrollIntoViewIfNeeded();await expect(history).not.toContainText('teamName');await expect(history).not.toContainText('hotelInfo');await shot('05-booking-history');const popupWait=page.waitForEvent('popup');await editor.getByRole('button',{name:'인쇄',exact:true}).click();const popup=await popupWait;await popup.waitForLoadState();assert.equal(await popup.locator('colgroup').count(),4);const cells=await popup.locator('th').allTextContents();assert.ok(cells.includes('수량'));await shot('06-booking-print',popup);await popup.close();await editor.getByRole('button',{name:'닫기',exact:true}).click();
 });
 await check('V03: dashboard more expands exact collection and collapses',async()=>{
  await page.goto('/');const more=pane().getByRole('button',{name:/더보기/}).first();await more.waitFor();await more.click();await expect(pane().getByRole('button',{name:/접기/}).first()).toBeVisible();await shot('07-dashboard-expanded');await pane().getByRole('button',{name:/접기/}).first().click();
 });
 await check('V04/V10/V19: accurate menu labels and canonical protected routes',async()=>{
  await page.getByRole('button',{name:'사용자 메뉴',exact:true}).click();await expect(page.getByRole('button',{name:'프로필 설정',exact:true})).toHaveCount(0);await shot('08-user-menu');await page.getByRole('button',{name:'사용자 메뉴',exact:true}).click();
  for(const route of ['/dashboard','/reservations','/calendar-week']){await page.goto(route);await page.getByRole('complementary',{name:'주 메뉴'}).waitFor();await page.getByRole('tablist',{name:'작업 탭'}).waitFor();await expect(page.getByRole('tab',{selected:true})).not.toHaveText('작업');}
  const response=await context.request.get('/icon-test');assert.equal(response.status(),404);await shot('09-canonical-route');
 });
 await check('V11: active tab and close affordance remain inside strip at limit',async()=>{
  await page.setViewportSize({width:390,height:844});while(await page.getByRole('tab').count()<10)await page.getByRole('button',{name:'새 작업 탭',exact:true}).click();await expect(page.getByRole('button',{name:'새 작업 탭',exact:true})).toBeDisabled();await page.waitForTimeout(300);const tab=page.getByRole('tab',{selected:true});const bounds=await tab.locator('..').boundingBox();assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=391,JSON.stringify(bounds));await shot('10-tabs-mobile');await page.setViewportSize({width:1440,height:1000});await shot('11-tabs-desktop');
 });
 await check('V07: terminal approval steps no longer read pending',async()=>{
  await page.goto('/approval');await pane().getByRole('button',{name:'반려',exact:true}).click();await page.waitForTimeout(300);const cards=pane().locator('article');assert.ok(await cards.count()>0);await expect(cards.first()).not.toContainText('· 대기');await shot('12-rejected-approval');await pane().getByRole('button',{name:'취소',exact:true}).click();await page.waitForTimeout(200);await expect(pane().locator('article').first()).not.toContainText('· 대기');await shot('13-cancelled-approval');
 });
 await check('V13/V15: account immutable fields locked; ledger identity remains on horizontal scroll',async()=>{
  await page.goto('/accounts');const account=pane().locator('article').filter({hasText:'금융검증-'}).first();await account.getByRole('button',{name:'수정',exact:true}).click();const currency=pane().getByLabel('통화',{exact:true});const opening=pane().getByLabel('기초잔액',{exact:true});assert.ok(await currency.isDisabled()||await currency.getAttribute('readonly')!==null);assert.ok(await opening.isDisabled()||await opening.getAttribute('readonly')!==null);await shot('14-locked-account');await pane().getByRole('button',{name:'취소',exact:true}).click();await page.setViewportSize({width:390,height:844});await pane().locator('table').locator('..').evaluate(el=>el.scrollLeft=el.scrollWidth);await shot('15-ledger-mobile-right');
 });
 await check('V13: employee identity remains available with right-side actions',async()=>{
  await page.goto('/settings');await pane().locator('table').waitFor();await pane().locator('table').locator('..').evaluate(el=>el.scrollLeft=el.scrollWidth);const cell=pane().locator('tbody tr').first().getByRole('rowheader');const box=await cell.boundingBox();assert.ok(box.x>=0&&box.x<390,JSON.stringify(box));await shot('16-settings-mobile-right');
 });
 await check('V14/V20: count chart has integer ticks, Korean measure, readable mobile money',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('/stats');await page.waitForTimeout(300);const text=await pane().innerText();assert.ok(!/\n0\.25\n|\n0\.75\n/.test(text));await shot('17-stats-desktop');await page.getByRole('button',{name:'분기별',exact:true}).click();await shot('18-stats-quarter');await page.setViewportSize({width:390,height:844});await shot('19-stats-mobile');
 });
 await check('V13/V18: airport names and sticky airline on stored timetable',async()=>{
  const snapshot=JSON.parse(await fs.readFile('apps/api-legacy/src/crawler/korean_flight_schedules.json','utf8')).PUS;snapshot.stale=true;snapshot.source='시각 재검증용 2025-07-29 저장 자료 · 실시간 아님';await page.route('**/api/v2/flights/schedule/*',r=>r.fulfill({json:snapshot}));await page.goto('/flight-schedule');await page.getByLabel('출발 공항').selectOption('PUS');await expect.poll(()=>page.getByLabel('도착 공항').locator('option').count()).toBeGreaterThan(1);await page.getByLabel('도착 공항').selectOption('NRT');await expect(page.getByLabel('도착 공항').locator('option:checked')).not.toHaveText('NRT - NRT');await pane().locator('table').locator('..').evaluate(el=>el.scrollLeft=el.scrollWidth);const airline=pane().locator('tbody tr').first().locator('th').first();const box=await airline.boundingBox();assert.ok(box.x>=0&&box.x<390,JSON.stringify(box));await shot('20-flights-mobile-right');await page.setViewportSize({width:1440,height:1000});await shot('21-flights-desktop');await page.unroute('**/api/v2/flights/schedule/*');
 });
 await check('V02/V16: history prepend preserves read position and no-match is explained',async()=>{
  await page.goto('/chat');await page.getByRole('button',{name:'조직도',exact:true}).click();await page.getByLabel('대화 또는 직원 검색').fill('NO_SUCH_EMPLOYEE_VISUAL');await expect(pane()).toContainText('검색');await shot('22-messenger-empty');await page.getByLabel('대화 또는 직원 검색').fill('');await page.getByRole('button',{name:'대화',exact:true}).click();await pane().locator('aside button').filter({hasText:'Entrip Demo'}).first().click();await page.setViewportSize({width:390,height:844});const older=page.getByRole('button',{name:'이전 메시지',exact:true});await older.scrollIntoViewIfNeeded();const region=page.getByRole('region',{name:'대화 메시지'});const before=await region.evaluate(el=>({top:el.scrollTop,height:el.scrollHeight,client:el.clientHeight}));await shot('23-message-history-before');await older.click();await page.waitForTimeout(600);const after=await region.evaluate(el=>({top:el.scrollTop,height:el.scrollHeight,client:el.clientHeight}));assert.ok(after.height>before.height);assert.ok(after.top+after.client<after.height-50,'History must not jump to newest messages');assert.ok(Math.abs(after.top-before.top-(after.height-before.height))<100,JSON.stringify({before,after}));await shot('24-message-history-after');return {before,after};
 });
 await check('V17: authentication error is Korean',async()=>{
  const temporary=await browser.newContext({baseURL:process.env.BASE_URL||'http://127.0.0.1:3000',viewport:{width:390,height:844}});const p=await temporary.newPage();await p.goto('/login');await p.getByLabel('회사 선택').selectOption('entrip');await p.getByLabel('역할 선택').selectOption('admin');await p.locator('input[name=password]').fill('wrong-password-for-visual-check');await p.getByRole('button',{name:'로그인',exact:true}).click();await expect(p.getByText(/이메일.*비밀번호|비밀번호.*확인/).first()).toBeVisible();await expect(p.locator('body')).not.toContainText('Invalid email or password');await shot('25-login-error',p);await temporary.close();
 });
} catch(e) { report.checks.push({name:'setup',status:'FAIL',error:e.stack}); }
finally { report.finishedAt=new Date().toISOString();report.status=report.checks.every(x=>x.status==='PASS')&&report.pageErrors.length===0?'PASS':'FAIL';await fs.writeFile(path.join(out,'visual-fixes-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1; }
