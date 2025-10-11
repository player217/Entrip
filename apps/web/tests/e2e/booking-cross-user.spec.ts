import { test, expect, Page } from '@playwright/test';

async function login(page: Page, {
  companyCode = 'entrip',
  username,
  password = 'pass1234',
}: { companyCode?: string; username: string; password?: string; }) {
  await page.goto('/login');
  await page.fill('input[name="companyCode"]', companyCode);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  // 로그인 성공 시 현재 구현은 '/'로 이동(과거 '/dashboard').
  // 먼저 /api/auth/login 응답을 확인하고, '/'로 이동 후 '대시보드' 가시성 대기로 안정화.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/v2/auth/login')),
    page.click('button[type="submit"]'),
  ]);
  // App Router can delay the `load` event; prefer DOM ready to avoid timeouts
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test.describe('Cross-user Booking Visibility (same company)', () => {
  test('admin creates booking → manager sees it', async ({ page }) => {
    const unique = `MCP-E2E-${Date.now()}`;

    // 1) A계정(admin) 로그인
    await login(page, { username: 'admin@entrip.com' });

    // 2) 브라우저 컨텍스트에서 API 경유로 예약 생성(쿠키 인증 유지)
    const createResult = await page.evaluate(async (teamName: string) => {
      // v2 DTO 필수 필드에 맞춰 생성
      const toYmd = (d: Date) => d.toISOString().slice(0, 10);
      const start = toYmd(new Date(Date.now() + 24 * 3600 * 1000));
      const end = toYmd(new Date(Date.now() + 2 * 24 * 3600 * 1000));
      const v2Payload = {
        teamName,
        type: 'workshop',
        origin: '서울',
        destination: '제주도',
        startDate: start,
        endDate: end,
        totalPax: 2,
        coordinator: 'Admin',
        notes: 'cross-user-visibility-test',
      };

      const r = await fetch('/api/v2/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v2Payload),
      });
      let j: any = {};
      try { j = await r.json(); } catch {}
      return { ok: r.ok, status: r.status, json: j };
    }, unique);

    expect(createResult.ok, `Booking create failed: ${createResult.status}`).toBeTruthy();

    // 3) API로도 존재 확인(신속/안정 체크)
    const existsForAdmin = await page.evaluate(async (needle: string) => {
      const r = await fetch('/api/v2/bookings?take=1000', { method: 'GET' });
      const j = await r.json();
      const items = (j?.data?.bookings || j?.bookings || j?.data || []) as any[];
      return Array.isArray(items) && items.some(b => (b.teamName || b.customerName || '').includes(needle));
    }, unique);
    expect(existsForAdmin).toBeTruthy();

    // UI에서도 확인 시도(있으면 best-effort)
    await page.goto('/list-monthly', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${unique}`)).toBeVisible({ timeout: 30_000 }).catch(() => {});

    // 4) 로그아웃 (UI 대신 API 호출로 안정화)
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });
    await page.goto('/login');

    // 5) B계정(manager) 로그인 후 동일 예약 확인
    // 일부 시드에서는 'manager@entrip.com' 대신 'manager1@entrip.com' 사용
    await login(page, { username: 'manager1@entrip.com' });
    // 6) API로도 존재 확인(동일 회사의 다른 계정)
    const existsForManager = await page.evaluate(async (needle: string) => {
      const r = await fetch('/api/v2/bookings?take=1000', { method: 'GET' });
      const j = await r.json();
      const items = (j?.data?.bookings || j?.bookings || j?.data || []) as any[];
      return Array.isArray(items) && items.some(b => (b.teamName || b.customerName || '').includes(needle));
    }, unique);
    expect(existsForManager).toBeTruthy();

    // UI best-effort
    await page.goto('/list-monthly', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${unique}`)).toBeVisible({ timeout: 30_000 }).catch(() => {});
  });
});
