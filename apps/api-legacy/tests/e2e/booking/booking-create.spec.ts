import { test, expect } from '@playwright/test';

test.describe('Booking Create E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login as ADMIN
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'admin-token');
      localStorage.setItem('user-role', 'ADMIN');
    });
    
    // Navigate to booking page
    await page.goto('http://localhost:3000/bookings');
    await page.waitForSelector('[data-testid="booking-list"]');
  });

  test('should create new booking successfully', async ({ page }) => {
    // Click create button
    await page.click('[data-testid="create-booking-btn"]');
    
    // Wait for modal to open
    await page.waitForSelector('[data-testid="booking-modal"]');
    
    // Fill in form fields
    await page.fill('[data-testid="customer-name-input"]', '최현준');
    await page.fill('[data-testid="team-name-input"]', 'VIP Golf Tour');
    await page.selectOption('[data-testid="booking-type-select"]', 'GROUP');
    await page.fill('[data-testid="destination-input"]', 'ICN');
    await page.fill('[data-testid="start-date-input"]', '2025-10-01');
    await page.fill('[data-testid="end-date-input"]', '2025-10-05');
    await page.fill('[data-testid="pax-count-input"]', '12');
    await page.fill('[data-testid="total-price-input"]', '24000000');
    
    // Submit form
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('예약이 성공적으로 생성되었습니다');
    
    // Verify new booking appears in list
    await page.waitForTimeout(1000); // Wait for list refresh
    const newBooking = page.locator('[data-testid="booking-item"]').filter({ hasText: '최현준' });
    await expect(newBooking).toBeVisible();
    await expect(newBooking).toContainText('VIP Golf Tour');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-create-success.png' });
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    // Click create button
    await page.click('[data-testid="create-booking-btn"]');
    
    // Wait for modal
    await page.waitForSelector('[data-testid="booking-modal"]');
    
    // Try to submit empty form
    await page.click('[data-testid="submit-booking-btn"]');
    
    // Check validation errors
    await expect(page.locator('[data-testid="customer-name-error"]')).toContainText('고객명은 필수입니다');
    await expect(page.locator('[data-testid="team-name-error"]')).toContainText('팀명은 필수입니다');
    await expect(page.locator('[data-testid="destination-error"]')).toContainText('목적지는 필수입니다');
    
    // Fill invalid pax count
    await page.fill('[data-testid="pax-count-input"]', '0');
    await page.click('[data-testid="submit-booking-btn"]');
    await expect(page.locator('[data-testid="pax-count-error"]')).toContainText('인원수는 1명 이상이어야 합니다');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-create-validation.png' });
  });

  test('should prevent USER role from creating booking', async ({ page }) => {
    // Change to USER role
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'user-token');
      localStorage.setItem('user-role', 'USER');
    });
    await page.reload();
    
    // Wait for page load
    await page.waitForSelector('[data-testid="booking-list"]');
    
    // Create button should be disabled or hidden
    const createButton = page.locator('[data-testid="create-booking-btn"]');
    await expect(createButton).toBeDisabled();
    
    // OR check if button is not visible
    // await expect(createButton).not.toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-create-forbidden.png' });
  });
});