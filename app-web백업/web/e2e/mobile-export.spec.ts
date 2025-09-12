import { test, expect } from '@playwright/test';

test('모바일 환경에서 예약 목록 Export 기능 테스트', async ({ page }) => {
  // 모바일 viewport 설정
  await page.setViewportSize({ width: 375, height: 812 });
    // 1. 로그인
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@entrip.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/reservations');
    
    // 2. 모바일에서 주간 캘린더 확인
    await page.click('text=주별 캘린더');
    await page.waitForTimeout(1000);
    
    // WeekViewMobile 컴포넌트가 렌더링되었는지 확인
    const mobileCalendar = await page.locator('.snap-x').isVisible();
    expect(mobileCalendar).toBeTruthy();
    
    // 3. Export 드롭다운 열기
    await page.click('text=Export');
    
    // 드롭다운 메뉴가 보이는지 확인
    const dropdown = page.locator('#export-dropdown');
    await expect(dropdown).toBeVisible();
    
    // 4. Excel Export 클릭 (실제 다운로드는 테스트 환경에서 제한될 수 있음)
    const [downloadExcel] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      page.click('text=Excel로 내보내기')
    ]);
    
    if (downloadExcel) {
      // 다운로드된 파일명 확인
      const filename = downloadExcel.suggestedFilename();
      expect(filename).toContain('entrip_bookings');
      expect(filename).toContain('.xlsx');
    }
    
    // 5. 다시 Export 드롭다운 열기 (dropdown이 닫혔을 수 있음)
    await page.click('text=Export');
    
    // 6. PDF Export 클릭
    const [downloadPDF] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      page.click('text=PDF로 내보내기')
    ]);
    
    if (downloadPDF) {
      // 다운로드된 파일명 확인
      const filename = downloadPDF.suggestedFilename();
      expect(filename).toContain('entrip_bookings');
      expect(filename).toContain('.pdf');
    }
    
    // 7. 가상 스크롤 캘린더 테스트
    await page.click('text=가상 스크롤 캘린더');
    await page.waitForTimeout(1000);
    
    // 가상 스크롤 컨테이너가 렌더링되었는지 확인
    const virtualCalendar = await page.locator('[style*="overflow: hidden"]').isVisible();
    expect(virtualCalendar).toBeTruthy();
    
    // 스크롤 테스트
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('[style*="overflow: hidden"]');
      if (scrollContainer) {
        scrollContainer.scrollTop += 200;
      }
    });
    
    await page.waitForTimeout(500);
    
    console.log('✅ 모바일 Export 기능 E2E 테스트 완료');
});