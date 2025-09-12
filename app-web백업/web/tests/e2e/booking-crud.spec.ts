import { test, expect } from '@playwright/test';

test.describe('Booking CRUD Operations', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login with admin credentials
    await page.fill('input[name="email"]', 'admin@entrip.com');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
  });

  test('should create a new booking', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/booking');
    
    // Click on "새 예약" button
    await page.click('button:has-text("새 예약")');
    
    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Fill in booking form
    await page.fill('input[name="teamName"]', 'E2E Test Team');
    await page.fill('input[name="destination"]', 'Seoul');
    await page.fill('input[name="customerName"]', 'Test Customer');
    
    // Set dates (using date inputs)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await page.fill('input[name="startDate"]', today.toISOString().split('T')[0]!);
    await page.fill('input[name="endDate"]', tomorrow.toISOString().split('T')[0]!);
    
    // Fill other required fields
    await page.fill('input[name="paxCount"]', '10');
    await page.fill('input[name="totalPrice"]', '1000000');
    
    // Submit the form
    await page.click('button:has-text("등록")');
    
    // Wait for modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    
    // Verify the booking appears in the list
    await expect(page.locator('text=E2E Test Team')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Test Customer')).toBeVisible();
  });

  test('should edit booking status to confirmed', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/booking');
    
    // Find and click on a booking card (assuming at least one exists)
    const bookingCard = page.locator('[data-testid="booking-card"]').first();
    await bookingCard.click();
    
    // Wait for edit modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Change status to confirmed
    await page.selectOption('select[name="status"]', 'CONFIRMED');
    
    // Save changes
    await page.click('button:has-text("저장")');
    
    // Wait for modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    
    // Verify status is updated (look for confirmed badge/tag)
    await expect(page.locator('text=/확정|CONFIRMED/')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a booking', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/booking');
    
    // Store the initial count of bookings
    const initialBookings = await page.locator('[data-testid="booking-card"]').count();
    
    // Find and click delete button on first booking
    const deleteButton = page.locator('[data-testid="delete-booking"]').first();
    await deleteButton.click();
    
    // Confirm deletion in the modal
    await expect(page.locator('text=/정말 삭제하시겠습니까|삭제 확인/')).toBeVisible();
    await page.click('button:has-text("삭제")');
    
    // Wait for the deletion to complete
    await page.waitForTimeout(1000);
    
    // Verify booking count decreased
    const finalBookings = await page.locator('[data-testid="booking-card"]').count();
    expect(finalBookings).toBe(initialBookings - 1);
  });

  test('should filter bookings by status', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/booking');
    
    // Click on status filter
    await page.click('button:has-text("상태")');
    
    // Select "확정" (Confirmed) status
    await page.click('label:has-text("확정")');
    
    // Apply filter
    await page.click('button:has-text("적용")');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Verify all visible bookings have confirmed status
    const bookingStatuses = await page.locator('[data-testid="booking-status"]').allTextContents();
    bookingStatuses.forEach(status => {
      expect(status).toMatch(/확정|CONFIRMED/);
    });
  });
});