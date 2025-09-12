import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for the login form to be visible
    await expect(page.locator('form')).toBeVisible();
    
    // Fill in email
    await page.fill('input[name="email"]', 'admin@entrip.com');
    
    // Fill in password
    await page.fill('input[name="password"]', 'admin');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for dashboard elements
    await expect(page.locator('h1:has-text("대시보드")')).toBeVisible({ timeout: 10000 });
  });

  test('should show error message with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in wrong credentials
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*login/);
    
    // Should show error message
    await expect(page.locator('text=/이메일 또는 비밀번호가 올바르지 않습니다|로그인에 실패했습니다/')).toBeVisible({ timeout: 5000 });
  });
});