import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    // 쿠키 삭제하여 로그아웃 상태 만들기
    await page.context().clearCookies();
    
    // 보호된 페이지 접근 시도
    await page.goto('/dashboard');
    
    // 로그인 페이지로 리다이렉트되는지 확인
    await expect(page).toHaveURL(/\/login/);
    
    // 로그인 폼이 표시되는지 확인
    await expect(page.locator('h1')).toContainText('로그인');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    // 로그인 폼 입력
    await page.fill('input[type="email"]', 'test@entrip.com');
    await page.fill('input[type="password"]', 'password');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 대시보드로 리다이렉트되는지 확인
    await expect(page).toHaveURL('/');
    
    // 헤더에 사용자 이름이 표시되는지 확인
    await expect(page.locator('header')).toContainText('테스트 사용자');
    
    // 스크린샷 캡처
    await page.screenshot({ path: 'e2e/screenshots/logged-in-dashboard.png' });
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login');
    
    // 잘못된 로그인 정보 입력
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 에러 메시지 확인
    await expect(page.locator('text=이메일 또는 비밀번호가 올바르지 않습니다')).toBeVisible();
    
    // URL이 로그인 페이지에 남아있는지 확인
    await expect(page).toHaveURL('/login');
  });
});
