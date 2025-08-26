import { test, expect } from '@playwright/test';

test.describe('예약 생성 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@entrip.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('로그인 → 예약 생성 → 달력 반영 Happy Path', async ({ page }) => {
    // 1. 예약 페이지로 이동
    await page.click('nav >> text=예약 관리');
    await page.waitForSelector('[data-testid="booking-page"]');
    
    // 2. 새 예약 버튼 클릭
    await page.click('button:has-text("새 예약")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // 3. 예약 정보 입력
    await page.fill('input[name="customerName"]', '홍길동');
    await page.fill('input[name="phoneNumber"]', '010-1234-5678');
    await page.fill('input[name="email"]', 'hong@example.com');
    
    // 여행 상품 선택
    await page.selectOption('select[name="productType"]', 'package');
    await page.fill('input[name="destination"]', '제주도');
    
    // 날짜 선택
    await page.click('input[name="departureDate"]');
    await page.click('button[aria-label="다음 달"]');
    await page.click('button:has-text("15")');
    
    await page.click('input[name="returnDate"]');
    await page.click('button:has-text("18")');
    
    // 인원 설정
    await page.fill('input[name="adultCount"]', '2');
    await page.fill('input[name="childCount"]', '1');
    
    // 가격 정보
    await page.fill('input[name="totalAmount"]', '1500000');
    await page.fill('input[name="depositAmount"]', '500000');
    
    // 4. 예약 저장
    await page.click('button:has-text("예약 생성")');
    
    // 성공 메시지 확인
    await expect(page.locator('.toast-success')).toHaveText(/예약이 성공적으로 생성되었습니다/);
    
    // 5. 달력 뷰로 이동
    await page.click('button:has-text("달력 보기")');
    await page.waitForSelector('[data-testid="calendar-view"]');
    
    // 6. 생성된 예약 확인
    const booking = page.locator('[data-booking-id]').filter({ hasText: '홍길동' });
    await expect(booking).toBeVisible();
    await expect(booking).toHaveClass(/booking-status-confirmed/);
    
    // 7. 예약 상세 확인
    await booking.click();
    await expect(page.locator('[role="dialog"] >> text=홍길동')).toBeVisible();
    await expect(page.locator('[role="dialog"] >> text=제주도')).toBeVisible();
    await expect(page.locator('[role="dialog"] >> text=₩1,500,000')).toBeVisible();
  });

  test('예약 수정 및 상태 변경', async ({ page }) => {
    // 예약 리스트에서 기존 예약 선택
    await page.goto('/booking');
    await page.click('tr[data-booking-id="1"] >> text=수정');
    
    // 상태 변경
    await page.selectOption('select[name="status"]', 'confirmed');
    
    // 메모 추가
    await page.fill('textarea[name="memo"]', '고객 요청: 창가석 배정 요망');
    
    // 저장
    await page.click('button:has-text("수정 완료")');
    
    // 변경사항 확인
    await expect(page.locator('.booking-status-confirmed')).toBeVisible();
    await expect(page.locator('text=창가석 배정 요망')).toBeVisible();
  });

  test('예약 취소 프로세스', async ({ page }) => {
    await page.goto('/booking');
    
    // 예약 선택
    await page.click('tr[data-booking-id="2"] >> text=상세');
    
    // 취소 버튼 클릭
    await page.click('button:has-text("예약 취소")');
    
    // 취소 사유 입력
    await page.fill('textarea[name="cancelReason"]', '고객 변심');
    
    // 환불 금액 확인
    const refundAmount = await page.locator('input[name="refundAmount"]').inputValue();
    expect(Number(refundAmount)).toBeGreaterThan(0);
    
    // 취소 확인
    await page.click('button:has-text("취소 처리")');
    
    // 확인 다이얼로그
    await page.click('button:has-text("확인")');
    
    // 상태 확인
    await expect(page.locator('.booking-status-cancelled')).toBeVisible();
  });
});

test.describe('예약 검색 및 필터링', () => {
  test('날짜 범위로 예약 검색', async ({ page }) => {
    await page.goto('/booking');
    
    // 날짜 필터 설정
    await page.click('button:has-text("필터")');
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-01-31');
    await page.click('button:has-text("적용")');
    
    // 결과 확인
    const bookings = await page.locator('tbody tr').count();
    expect(bookings).toBeGreaterThan(0);
    
    // 날짜 확인
    const firstDate = await page.locator('tbody tr:first-child td.departure-date').textContent();
    expect(firstDate).toMatch(/2025-01/);
  });

  test('팀별 예약 필터링', async ({ page }) => {
    await page.goto('/booking');
    
    // 팀 선택
    await page.selectOption('select[name="team"]', 'sales-team-1');
    
    // 결과 확인
    await expect(page.locator('tbody tr')).toHaveCount(5); // 예시
    await expect(page.locator('text=영업1팀')).toBeVisible();
  });
});

test.describe('모바일 반응형 테스트', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  
  test('모바일에서 예약 생성', async ({ page }) => {
    await page.goto('/booking');
    
    // 햄버거 메뉴 확인
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // 플로팅 액션 버튼
    await page.click('[data-testid="fab-new-booking"]');
    
    // 모달이 전체 화면으로 표시되는지 확인
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toHaveCSS('position', 'fixed');
    await expect(modal).toHaveCSS('inset', '0px');
  });
});