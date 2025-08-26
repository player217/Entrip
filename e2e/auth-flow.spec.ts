import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL('/login');
    
    // Login page should be visible
    await expect(page.locator('h1')).toContainText('로그인');
  });

  test('should show login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check form elements exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check button text
    await expect(page.locator('button[type="submit"]')).toContainText('로그인');
  });

  test.skip('should login and access dashboard', async ({ page }) => {
    // This test is skipped until we have test credentials
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Dashboard should be visible
    await expect(page.locator('h1')).toContainText('대시보드');
  });
});

test.describe('Page Rendering', () => {
  test('should render home page', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check response status
    expect(response?.status()).toBeLessThan(400);
    
    // Should redirect to dashboard or login
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)$/);
  });

  test('should render 404 for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-route');
    
    // Should show 404 page
    await expect(page.locator('text=404')).toBeVisible();
  });
});

test.describe('Static Assets', () => {
  test('should load CSS files', async ({ page }) => {
    await page.goto('/login');
    
    // Check if any CSS is loaded
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links => 
      links.map(link => link.getAttribute('href'))
    );
    
    expect(stylesheets.length).toBeGreaterThan(0);
    
    // Check if CSS files are accessible
    for (const stylesheet of stylesheets) {
      if (stylesheet) {
        const response = await page.request.get(stylesheet);
        expect(response.status()).toBe(200);
      }
    }
  });
});