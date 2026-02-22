import { test, expect } from '@playwright/test';

test.describe('Booking Update E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login as MANAGER
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'manager-token');
      localStorage.setItem('user-role', 'MANAGER');
    });
    
    // Navigate to booking page
    await page.goto('http://localhost:3000/bookings');
    await page.waitForSelector('[data-testid="booking-list"]');
  });

  test('should update booking status successfully', async ({ page }) => {
    // Find pending booking (BK2507130002)
    const pendingBooking = page.locator('[data-testid="booking-item"]').filter({ hasText: 'BK2507130002' });
    await pendingBooking.click();
    
    // Wait for detail modal
    await page.waitForSelector('[data-testid="booking-detail-modal"]');
    
    // Click edit button
    await page.click('[data-testid="edit-booking-btn"]');
    
    // Change status to CONFIRMED
    await page.selectOption('[data-testid="status-select"]', 'CONFIRMED');
    
    // Update pax count
    await page.fill('[data-testid="pax-count-input"]', '20');
    
    // Save changes
    await page.click('[data-testid="save-booking-btn"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('예약이 성공적으로 수정되었습니다');
    
    // Verify changes in list
    await page.click('[data-testid="close-modal-btn"]');
    await page.waitForTimeout(1000);
    
    const updatedBooking = page.locator('[data-testid="booking-item"]').filter({ hasText: 'BK2507130002' });
    await expect(updatedBooking).toContainText('CONFIRMED');
    await expect(updatedBooking).toContainText('20명');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-update-success.png' });
  });

  test('should show optimistic update and rollback on error', async ({ page, context }) => {
    // Find first booking
    const firstBooking = page.locator('[data-testid="booking-item"]').first();
    const originalStatus = await firstBooking.locator('[data-testid="booking-status"]').textContent();
    
    await firstBooking.click();
    await page.waitForSelector('[data-testid="booking-detail-modal"]');
    await page.click('[data-testid="edit-booking-btn"]');
    
    // Intercept update API to fail
    await context.route('**/bookings/*', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Update failed' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Change status
    await page.selectOption('[data-testid="status-select"]', 'CANCELLED');
    await page.click('[data-testid="save-booking-btn"]');
    
    // Should show error message
    await page.waitForSelector('[data-testid="error-toast"]');
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('예약 수정에 실패했습니다');
    
    // Close modal
    await page.click('[data-testid="close-modal-btn"]');
    
    // Status should be rolled back to original
    const rolledBackBooking = page.locator('[data-testid="booking-item"]').first();
    await expect(rolledBackBooking.locator('[data-testid="booking-status"]')).toContainText(originalStatus || '');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-update-rollback.png' });
  });

  test('should prevent unauthorized updates', async ({ page }) => {
    // Change to USER role
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'user-token');
      localStorage.setItem('user-role', 'USER');
    });
    await page.reload();
    
    // Wait for bookings
    await page.waitForSelector('[data-testid="booking-list"]');
    
    // Click on a booking
    const booking = page.locator('[data-testid="booking-item"]').first();
    await booking.click();
    
    // Wait for detail modal
    await page.waitForSelector('[data-testid="booking-detail-modal"]');
    
    // Edit button should be disabled or hidden for USER role
    const editButton = page.locator('[data-testid="edit-booking-btn"]');
    await expect(editButton).toBeDisabled();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/booking-update-forbidden.png' });
  });
});