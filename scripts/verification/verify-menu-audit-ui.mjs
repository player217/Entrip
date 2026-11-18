/**
 * Read-mostly screenshot collector, not a visual pass/fail test.
 * Run against an already running app/API and a disposable or authorized account:
 * BASE_URL=http://127.0.0.1:3000 node scripts/verification/verify-menu-audit-ui.mjs
 * Each run has its own directory; earlier visual evidence is never overwritten.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('Collect 12 Entrip menus at 1440, 800 and 390 px. Requires running web/API.\n' +
    'Environment: BASE_URL, TEST_COMPANY, TEST_ROLE, TEST_EMAIL, TEST_PASSWORD, ' +
    'BROWSER_EXECUTABLE_PATH, VERIFICATION_OUTPUT_DIR.\n' +
    'Default output: docs/verification/visual-menu-recheck/<unique-run>/\n' +
    'No business records are created, changed or deleted. Login creates a session. ' +
    'Screenshots may contain account data; use an appropriate test account.\n' +
    'Human review is required. CAPTURED is not a visual PASS.');
  process.exit(0);
}

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const outputDir = path.join(process.env.VERIFICATION_OUTPUT_DIR || path.resolve('docs/verification/visual-menu-recheck'), runId);
await mkdir(outputDir, { recursive: true });

const menus = [
  ['dashboard', '대시보드', '/', '대시보드'],
  ['month-calendar', '월별 캘린더', '/calendar-monthly', '월간 캘린더'],
  ['week-calendar', '주별 캘린더', '/calendar-weekly', '주간 캘린더'],
  ['month-list', '월별 리스트', '/list-monthly', '월간 목록'],
  ['week-list', '주별 리스트', '/list-weekly', '주간 목록'],
  ['stats', '운영현황', '/stats', '운영 현황'],
  ['flights', '항공편 조회', '/flight-schedule', '항공편 스케줄 조회'],
  ['approval', '결재', '/approval', '결재 관리'],
  ['accounts', '계좌관리', '/accounts', '계좌 관리'],
  ['messenger', '메신저', '/chat', '메신저'],
  ['mail', '메일', '/mail', '메일'],
  ['settings', '맞춤설정', '/settings', '설정'],
].map(([id, label, route, heading]) => ({ id, label, route, heading }));
const report = {
  schema: 'entrip.visual-menu-collection/1', runId, baseURL,
  startedAt: new Date().toISOString(), status: 'COLLECTING',
  visualAssessment: 'NOT_REVIEWED', requiresHumanReview: true,
  scope: 'Initial/read-only menu states; forms, save flows and remote service success need separate inspection.',
  limitations: [
    'No screenshot comparison or automatic visual PASS is performed.',
    'Bounding-box observations are review candidates, not confirmed defects.',
    'Scrollable tables and content below the viewport may be intentionally clipped.',
    'Accessible names below are DOM label candidates; the separate ARIA snapshot is the browser accessibility representation.',
    'No forms are submitted after login; messenger conversations are not opened.',
  ],
  expectedCaptures: menus.length * 3, captures: [], pageErrors: [], dialogs: [], failures: [],
};
let browser;
let page;
let captureContext = 'startup';
const errorText = error => error instanceof Error ? error.stack || error.message : String(error);
const persist = () => writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));

// Runs inside the page. Coordinates are CSS pixels relative to the viewport.
function collectGeometry() {
  const round = number => Math.round(number * 100) / 100;
  const rect = element => {
    const r = element.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), left: round(r.left), top: round(r.top), right: round(r.right), bottom: round(r.bottom), width: round(r.width), height: round(r.height) };
  };
  const rendered = element => {
    const style = getComputedStyle(element);
    return element.getClientRects().length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const text = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const description = element => ({ tag: element.tagName.toLowerCase(), id: element.id || null, role: element.getAttribute('role'), ariaLabel: element.getAttribute('aria-label'), className: String(element.className || '').slice(0, 220) });
  const label = element => {
    const labelledBy = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent).join(' ');
    const nativeLabels = element.labels ? Array.from(element.labels).map(item => item.textContent).join(' ') : '';
    return text(element.getAttribute('aria-label') || labelledBy || nativeLabels || element.getAttribute('title') || element.getAttribute('placeholder') || (element.matches('input,textarea,select') ? '' : element.textContent));
  };
  const pane = Array.from(document.querySelectorAll('[role="tabpanel"]')).find(rendered);
  const viewport = { width: innerWidth, height: innerHeight };
  const controls = Array.from(document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href],[role="button"],[role="tab"],[role="checkbox"],[role="combobox"]')).filter(rendered).map(element => {
    const bounds = rect(element);
    let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const clippingAncestors = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
      const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
      if (!clipsX && !clipsY) continue;
      const bounds = rect(parent);
      if (clipsX) { clip.left = Math.max(clip.left, bounds.left); clip.right = Math.min(clip.right, bounds.right); }
      if (clipsY) { clip.top = Math.max(clip.top, bounds.top); clip.bottom = Math.min(clip.bottom, bounds.bottom); }
      clippingAncestors.push({ ...description(parent), bounds, overflowX: style.overflowX, overflowY: style.overflowY, scrollLeft: parent.scrollLeft, scrollTop: parent.scrollTop });
    }
    const visibleWidth = Math.max(0, Math.min(bounds.right, clip.right) - Math.max(bounds.left, clip.left));
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, clip.bottom) - Math.max(bounds.top, clip.top));
    const horizontalClip = bounds.width > 0 && visibleWidth < bounds.width - 1;
    const verticalClip = bounds.height > 0 && visibleHeight < bounds.height - 1;
    const toolbar = element.closest('[role="toolbar"],header,form,[role="group"]');
    return {
      ...description(element), label: label(element), type: element.getAttribute('type'),
      disabled: Boolean(element.disabled) || element.getAttribute('aria-disabled') === 'true',
      bounds, visibleWidth: round(visibleWidth), visibleHeight: round(visibleHeight),
      clippingAncestors, inActivePane: Boolean(pane?.contains(element)),
      toolbar: toolbar ? { ...description(toolbar), bounds: rect(toolbar) } : null,
      clipping: { horizontal: horizontalClip, vertical: verticalClip, belowViewport: bounds.top >= innerHeight, aboveViewport: bounds.bottom <= 0, intersectsViewportVertically: bounds.bottom > 0 && bounds.top < innerHeight },
      textExtent: { clientWidth: element.clientWidth, scrollWidth: element.scrollWidth },
    };
  });
  const overflowContainers = Array.from((pane || document.body).querySelectorAll('*')).filter(rendered).filter(element => element.scrollWidth > element.clientWidth + 1).map(element => {
    const style = getComputedStyle(element);
    return { ...description(element), bounds: rect(element), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowX: style.overflowX, overflowY: style.overflowY };
  });
  const candidates = controls.filter(control => control.clipping.horizontal && control.clipping.intersectsViewportVertically).map(control => ({
    kind: ['input', 'select', 'textarea'].includes(control.tag) ? 'HORIZONTAL_CONTROL_CLIPPING' : 'HORIZONTAL_ACTION_CLIPPING',
    label: control.label, tag: control.tag, bounds: control.bounds, visibleWidth: control.visibleWidth, inActivePane: control.inActivePane,
  }));
  if (document.documentElement.scrollWidth > innerWidth + 1) candidates.unshift({ kind: 'DOCUMENT_HORIZONTAL_OVERFLOW', viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth });
  return {
    viewport, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
    activePane: pane ? { bounds: rect(pane), clientWidth: pane.clientWidth, scrollWidth: pane.scrollWidth, clientHeight: pane.clientHeight, scrollHeight: pane.scrollHeight } : null,
    controls, overflowContainers, reviewCandidates: candidates,
    statusMessages: Array.from(document.querySelectorAll('[role="alert"],[role="status"]')).filter(rendered).map(element => ({ role: element.getAttribute('role'), text: text(element.textContent), bounds: rect(element) })),
  };
}

async function selectMenu(menu, width) {
  const sidebar = page.getByRole('complementary', { name: '주 메뉴', exact: true });
  if (width < 768 && !await sidebar.isVisible()) await page.getByRole('button', { name: '메뉴 열기', exact: true }).click();
  const expand = sidebar.getByRole('button', { name: '사이드바 펼치기', exact: true });
  if (await expand.isVisible()) await expand.click();
  if (['month-calendar', 'week-calendar', 'month-list', 'week-list'].includes(menu.id)) {
    const bookingMenu = sidebar.getByRole('button', { name: '예약관리', exact: true });
    if (await bookingMenu.getAttribute('aria-expanded') !== 'true') await bookingMenu.click();
  }
  await sidebar.getByRole('navigation').getByRole('button', { name: menu.label, exact: true }).click();
  const pane = page.locator('[role="tabpanel"]:visible');
  await pane.getByRole('heading', { name: menu.heading, exact: true }).waitFor({ timeout: 30000 });
  await pane.evaluate(element => { element.scrollTop = 0; element.scrollLeft = 0; });
  // Avoid networkidle: this app maintains a WebSocket. Bounded settling captures errors too.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return pane;
}

try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push({ context: captureContext, message: error.message, at: new Date().toISOString() }));
  page.on('dialog', async dialog => {
    report.dialogs.push({ context: captureContext, type: dialog.type(), message: dialog.message(), action: 'dismissed' });
    await dialog.dismiss();
  });
  captureContext = 'login';
  await page.goto(`${baseURL}/login`);
  const hostCompany = page.locator('input[name="companyCode"]');
  if (await hostCompany.isVisible()) {
    await hostCompany.fill(process.env.TEST_COMPANY || 'entrip');
  } else {
    await page.getByLabel('회사 선택').selectOption(process.env.TEST_COMPANY || 'entrip');
    await page.getByLabel('역할 선택').selectOption(process.env.TEST_ROLE || 'admin');
  }
  if (process.env.TEST_EMAIL) await page.locator('input[name="username"]').fill(process.env.TEST_EMAIL);
  if (process.env.TEST_PASSWORD) await page.locator('input[name="password"]').fill(process.env.TEST_PASSWORD);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.getByRole('tablist', { name: '작업 탭', exact: true }).waitFor({ timeout: 30000 });

  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const menu of menus) {
      captureContext = `${width}-${menu.id}`;
      const prefix = captureContext;
      const entry = { ...menu, width, startedAt: new Date().toISOString(), collectionStatus: 'COLLECTING', visualAssessment: 'NOT_REVIEWED', screenshots: [], pageErrors: [] };
      const firstError = report.pageErrors.length;
      try {
        const pane = await selectMenu(menu, width);
        entry.url = page.url();
        entry.routeMatches = new URL(entry.url).pathname === menu.route;
        entry.geometry = await page.evaluate(collectGeometry);
        await page.screenshot({ path: path.join(outputDir, `${prefix}-top.png`), fullPage: false, animations: 'disabled' });
        entry.screenshots.push(`${prefix}-top.png`);
        await writeFile(path.join(outputDir, `${prefix}.aria.yml`), await page.locator('body').ariaSnapshot());
        entry.ariaSnapshot = `${prefix}.aria.yml`;
        if (entry.geometry.activePane?.scrollHeight > entry.geometry.activePane?.clientHeight + 8) {
          await pane.evaluate(element => { element.scrollTop = element.scrollHeight; });
          await page.waitForTimeout(100);
          await page.screenshot({ path: path.join(outputDir, `${prefix}-bottom.png`), fullPage: false, animations: 'disabled' });
          entry.screenshots.push(`${prefix}-bottom.png`);
          entry.bottomGeometry = await page.evaluate(collectGeometry);
          await pane.evaluate(element => { element.scrollTop = 0; });
        }
        entry.collectionStatus = 'CAPTURED_REQUIRES_REVIEW';
      } catch (error) {
        entry.collectionStatus = 'INCOMPLETE';
        entry.error = errorText(error);
        const filename = `${prefix}-collection-error.png`;
        await page.screenshot({ path: path.join(outputDir, filename), fullPage: false }).then(() => entry.screenshots.push(filename)).catch(() => {});
        report.failures.push({ context: captureContext, error: entry.error });
      }
      entry.pageErrors = report.pageErrors.slice(firstError);
      entry.completedAt = new Date().toISOString();
      report.captures.push(entry);
      await persist();
      console.log(JSON.stringify({ context: captureContext, collectionStatus: entry.collectionStatus, candidates: entry.geometry?.reviewCandidates.length ?? null, pageErrors: entry.pageErrors.length }));
    }
  }
} catch (error) {
  report.failures.push({ context: captureContext, error: errorText(error) });
} finally {
  report.completedAt = new Date().toISOString();
  report.status = report.failures.length || report.captures.length !== report.expectedCaptures ? 'COLLECTION_INCOMPLETE' : 'COLLECTION_COMPLETE_REQUIRES_HUMAN_REVIEW';
  report.summary = {
    capturedMenus: report.captures.filter(entry => entry.collectionStatus === 'CAPTURED_REQUIRES_REVIEW').length,
    screenshotCount: report.captures.reduce((sum, entry) => sum + entry.screenshots.length, 0),
    geometryReviewCandidates: report.captures.reduce((sum, entry) => sum + (entry.geometry?.reviewCandidates.length || 0) + (entry.bottomGeometry?.reviewCandidates.length || 0), 0),
    pageErrorCount: report.pageErrors.length,
  };
  await persist();
  await writeFile(path.join(outputDir, 'README.md'), `# Entrip visual menu collection\n\nStatus: ${report.status}\n\nThis is screenshot evidence, **not a visual PASS**. Open every image and review report.json plus the browser ARIA snapshots. Geometry candidates can include intentional table scrolling; no finding is automatically cleared.\n\nThe collector visited 12 menus at 1440, 800 and 390 px. It did not open edit forms, submit business data, send messages, or verify remote flight/mail services. Use the separate functional verification flows for those actions.\n\nStarted: ${report.startedAt}\nCompleted: ${report.completedAt}\n`);
  await browser?.close();
  console.log(JSON.stringify({ status: report.status, visualAssessment: report.visualAssessment, outputDir, summary: report.summary }));
}
// A nonzero exit means collection was incomplete, not that the visual review ran.
if (report.status === 'COLLECTION_INCOMPLETE') process.exitCode = 1;
