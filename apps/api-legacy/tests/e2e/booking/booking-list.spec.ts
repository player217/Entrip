import { test, expect } from '@playwright/test';

test.describe('Booking List E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login by setting auth token
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'test-token');
    });
  });

  test('should display booking list with 3 bookings', async ({ page }) => {
    // Navigate to booking page
    await page.goto('http://localhost:3000/bookings');
    
    // Wait for bookings to load
    await page.waitForSelector('[data-testid="booking-list"]');
    
    // Check that 3 bookings are displayed
    const bookingItems = await page.locator('[data-testid="booking-item"]').count();
    expect(bookingItems).toBe(3);
    
    // Verify first booking details
    const firstBooking = page.locator('[data-testid="booking-item"]').first();
    await expect(firstBooking).toContainText('BK2507130001');
    await expect(firstBooking).toContainText('김철수');
    await expect(firstBooking).toContainText('Demo Incentive');
    await expect(firstBooking).toContainText('BUSINESS');
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-list.png' });
  });

  test('should filter bookings by customer name', async ({ page }) => {
    // Navigate to booking page
    await page.goto('http://localhost:3000/bookings');
    
    // Wait for bookings to load
    await page.waitForSelector('[data-testid="booking-list"]');
    
    // Type in search input
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('이영희');
    
    // Wait for filtered results
    await page.waitForTimeout(500); // debounce delay
    
    // Should only show 1 booking
    const bookingItems = await page.locator('[data-testid="booking-item"]').count();
    expect(bookingItems).toBe(1);
    
    // Verify filtered booking
    const filteredBooking = page.locator('[data-testid="booking-item"]');
    await expect(filteredBooking).toContainText('BK2507130002');
    await expect(filteredBooking).toContainText('이영희');
    await expect(filteredBooking).toContainText('Golf Tour Team');
  });

  test('should display error message when API fails', async ({ page, context }) => {
    // Intercept API call and make it fail
    await context.route('**/bookings', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Navigate to booking page
    await page.goto('http://localhost:3000/bookings');
    
    // Should display error message
    await page.waitForSelector('[data-testid="error-message"]');
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toContainText('예약 목록을 불러오는 중 오류가 발생했습니다');
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-list-error.png' });
  });
});