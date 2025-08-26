import { test, expect } from '@playwright/test';

test.describe('Dashboard to Reservations Navigation', () => {
  test('should navigate from dashboard to reservations page via sidebar', async ({ page }) => {
    // 대시보드 페이지로 이동
    await page.goto('/');
    
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForLoadState('networkidle');
    
    // 대시보드 타이틀 확인
    await expect(page.locator('h1')).toContainText('대시보드');
    
    // 사이드바의 예약 관리 링크 찾기
    const reservationLink = page.locator('nav a[href="/reservations"]');
    await expect(reservationLink).toBeVisible();
    
    // 예약 관리 링크 클릭
    await reservationLink.click();
    
    // URL이 변경되었는지 확인
    await expect(page).toHaveURL('/reservations');
    
    // 예약 관리 페이지 타이틀 확인
    await expect(page.locator('h1')).toContainText('예약 관리');
    
    // 캘린더 뷰가 기본으로 표시되는지 확인
    const calendarView = page.locator('[class*="CalendarMonth"]');
    await expect(calendarView).toBeVisible();
    
    // 스크린샷 캡처
    await page.screenshot({ path: 'e2e/screenshots/reservations-page.png' });
  });

  test('should switch between calendar and list views', async ({ page }) => {
    // 예약 관리 페이지로 직접 이동
    await page.goto('/reservations');
    
    // 페이지 로드 대기
    await page.waitForLoadState('networkidle');
    
    // 리스트 뷰 탭 클릭
    const listViewTab = page.locator('button:has-text("리스트 뷰")');
    await listViewTab.click();
    
    // DataGrid가 표시되는지 확인
    const dataGrid = page.locator('table');
    await expect(dataGrid).toBeVisible();
    
    // 월별 캘린더 탭으로 다시 전환
    const calendarTab = page.locator('button:has-text("월별 캘린더")');
    await calendarTab.click();
    
    // 캘린더가 다시 표시되는지 확인
    const calendarView = page.locator('[class*="CalendarMonth"]');
    await expect(calendarView).toBeVisible();
  });
});
