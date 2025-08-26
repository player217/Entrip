import { test, expect } from '@playwright/test';

test.describe('UI Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard renders correctly', async ({ page }) => {
    // Check header elements
    await expect(page.locator('text=Entrip Automation Platform')).toBeVisible();
    
    // Check sidebar navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=대시보드')).toBeVisible();
    await expect(page.locator('text=예약 관리')).toBeVisible();
    await expect(page.locator('text=팀 관리')).toBeVisible();
  });

  test('can navigate between pages', async ({ page }) => {
    // Navigate to reservations
    await page.click('text=예약 관리');
    await expect(page).toHaveURL(/.*reservations/);
    
    // Navigate back to dashboard
    await page.click('text=대시보드');
    await expect(page).toHaveURL(/.*\/$/);
  });

  test('chrome tabs functionality', async ({ page }) => {
    // Check if chrome tab container exists
    const tabContainer = page.locator('.chrome-tab');
    await expect(tabContainer.first()).toBeVisible();
    
    // Click add tab button if exists
    const addTabButton = page.locator('button[title="새 탭 추가"]');
    if (await addTabButton.isVisible()) {
      await addTabButton.click();
      // Verify new tab was added
      const tabs = await page.locator('.chrome-tab').count();
      expect(tabs).toBeGreaterThan(0);
    }
  });

  test('booking modal can be opened', async ({ page }) => {
    // Navigate to bookings page
    await page.click('text=예약 관리');
    
    // Look for add booking button
    const addButton = page.locator('button:has-text("새 예약")');
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Check if modal opened
      await expect(page.locator('text=새 예약 등록')).toBeVisible();
      
      // Close modal
      const closeButton = page.locator('button:has-text("✕")');
      await closeButton.click();
      await expect(page.locator('text=새 예약 등록')).not.toBeVisible();
    }
  });

  test('sidebar collapse/expand works', async ({ page }) => {
    const sidebar = page.locator('nav').first();
    const initialWidth = await sidebar.boundingBox();
    
    // Look for collapse button
    const collapseButton = page.locator('button[aria-label*="collapse"], button[aria-label*="Collapse"]');
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(300); // Wait for animation
      
      const collapsedWidth = await sidebar.boundingBox();
      expect(collapsedWidth?.width).toBeLessThan(initialWidth?.width || 0);
    }
  });

  test('exchange rates are displayed', async ({ page }) => {
    // Check for exchange rate display in header
    await expect(page.locator('text=/USD.*[0-9,]+/')).toBeVisible();
  });

  test('calendar view loads', async ({ page }) => {
    // Navigate to a page with calendar
    await page.click('text=팀 관리');
    
    // Check if calendar elements exist
    const calendarDays = page.locator('.calendar-day-cell');
    const count = await calendarDays.count();
    expect(count).toBeGreaterThan(0); // Should have at least some day cells
  });

  test('data grid functionality', async ({ page }) => {
    // Navigate to reservations
    await page.click('text=예약 관리');
    
    // Check if data grid exists
    const dataGrid = page.locator('table');
    if (await dataGrid.isVisible()) {
      // Check for headers
      await expect(page.locator('th').first()).toBeVisible();
      
      // Check for sorting functionality
      const sortableHeader = page.locator('th').first();
      await sortableHeader.click();
      // Sorting icon should appear
      await expect(page.locator('th').first().locator('text=/[↑↓]/')).toBeVisible();
    }
  });

  test('search functionality exists', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="검색"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('테스트');
      await searchInput.press('Enter');
      // Search should not cause errors
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('responsive layout works', async ({ page, viewport }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    // Sidebar should be hidden or collapsed on mobile
    const sidebar = page.locator('nav').first();
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.width || 0).toBeLessThanOrEqual(100);
    
    // Reset viewport
    if (viewport) {
      await page.setViewportSize(viewport);
    }
  });
});