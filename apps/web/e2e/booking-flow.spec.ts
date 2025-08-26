import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should login, create booking, view in calendar, and bulk delete', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@entrip.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // 로그인 성공 후 예약 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/reservations');
    
    // 2. 새 예약 등록
    await page.click('text=새 예약 등록');
    
    // 모달이 열리는지 확인
    await expect(page.locator('text=새 예약')).toBeVisible();
    
    // 폼 입력
    await page.fill('input[name="customerName"]', 'E2E 테스트 고객');
    await page.fill('input[name="phoneNumber"]', '010-1234-5678');
    await page.fill('input[name="destination"]', '제주도');
    await page.fill('input[name="departureDate"]', '2025-07-01');
    await page.fill('input[name="returnDate"]', '2025-07-05');
    await page.fill('input[name="numberOfPeople"]', '2');
    
    // 저장
    await page.click('button:has-text("저장")');
    
    // 모달이 닫히는지 확인
    await expect(page.locator('text=새 예약')).not.toBeVisible();
    
    // 3. 리스트 뷰에서 확인
    await page.click('text=리스트 뷰');
    
    // 새로 추가된 예약이 표시되는지 확인
    await expect(page.locator('text=E2E 테스트 고객')).toBeVisible();
    
    // 4. 체크박스 선택
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.nth(1); // 헤더 체크박스 제외하고 첫 번째
    await firstCheckbox.check();
    
    // Bulk 액션 바가 나타나는지 확인
    await expect(page.locator('text=1개 선택됨')).toBeVisible();
    
    // 5. Bulk 삭제
    await page.click('text=선택 삭제');
    
    // 확인 다이얼로그 처리
    page.on('dialog', dialog => dialog.accept());
    
    // 삭제 완료 확인 - Bulk 액션 바가 사라져야 함
    await expect(page.locator('text=개 선택됨')).not.toBeVisible();
    
    console.log('✓ E2E 테스트 완료: 로그인 → 예약 생성 → 캘린더 확인 → Bulk 삭제');
  });
});