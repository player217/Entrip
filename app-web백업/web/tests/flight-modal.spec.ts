import { test, expect } from '@playwright/test';

test.describe('Flight Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@entrip.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/bookings');
  });

  test('should open flight modal when airplane icon is clicked', async ({ page }) => {
    // Find and click the airplane icon
    const airplaneButton = await page.locator('button[title="항공편 정보"]');
    await expect(airplaneButton).toBeVisible();
    await airplaneButton.click();
    
    // Check if modal is visible
    await expect(page.locator('h2:has-text("✈️ 항공편 정보")')).toBeVisible();
    
    // Check if airport selector is visible
    await expect(page.locator('select')).toBeVisible();
    
    // Wait for flight table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Count table rows (excluding header)
    const rows = await page.locator('tbody tr').count();
    console.log(`[Playwright] Flight table has ${rows} rows`);
    
    // Expect at least 20 rows
    expect(rows).toBeGreaterThanOrEqual(20);
    
    // Check for required columns
    await expect(page.locator('th:has-text("항공편")')).toBeVisible();
    await expect(page.locator('th:has-text("평균 지연")')).toBeVisible();
    await expect(page.locator('th:has-text("실시간 상태")')).toBeVisible();
    
    // Close modal
    await page.locator('button').filter({ has: page.locator('svg') }).first().click();
    
    // Verify modal is closed
    await expect(page.locator('h2:has-text("✈️ 항공편 정보")')).not.toBeVisible();
  });

  test('should change airport and update flight table', async ({ page }) => {
    // Open modal
    await page.locator('button[title="항공편 정보"]').click();
    await page.waitForSelector('h2:has-text("✈️ 항공편 정보")');
    
    // Change airport
    const select = await page.locator('select');
    await select.selectOption('GMP');
    
    // Wait for table to update
    await page.waitForTimeout(1000);
    
    // Check that departure column shows GMP
    const departureCell = await page.locator('tbody tr:first-child td:nth-child(3)').textContent();
    expect(departureCell).toBe('GMP');
  });

  test('should display real-time status colors', async ({ page }) => {
    // Open modal
    await page.locator('button[title="항공편 정보"]').click();
    await page.waitForSelector('table');
    
    // Check for status color classes
    const statusCells = await page.locator('tbody tr td:nth-child(8)').all();
    let hasColoredStatus = false;
    
    for (const cell of statusCells.slice(0, 10)) {
      const className = await cell.getAttribute('class');
      if (className && (className.includes('text-green') || className.includes('text-red') || className.includes('text-blue'))) {
        hasColoredStatus = true;
        break;
      }
    }
    
    expect(hasColoredStatus).toBe(true);
  });

  test('should show delayed and normal status in Korean', async ({ page }) => {
    // Open modal
    await page.locator('button[title="항공편 정보"]').click();
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Wait for status data to load
    await page.waitForTimeout(1000);
    
    // Check for Korean status text
    const delayedCount = await page.locator('td:has-text("지연")').count();
    const normalCount = await page.locator('td:has-text("정상")').count();
    const boardingCount = await page.locator('td:has-text("탑승중")').count();
    
    console.log(`[Playwright] Status counts - 지연: ${delayedCount}, 정상: ${normalCount}, 탑승중: ${boardingCount}`);
    
    // Expect at least one status to be shown
    expect(delayedCount + normalCount + boardingCount).toBeGreaterThan(0);
  });

  test('should display delay times with color coding', async ({ page }) => {
    // Open modal
    await page.locator('button[title="항공편 정보"]').click();
    await page.waitForSelector('table');
    
    // Check delay column (7th column)
    const delayCells = await page.locator('tbody tr td:nth-child(7)').all();
    let hasRedDelay = false;
    let hasGreenDelay = false;
    
    for (const cell of delayCells.slice(0, 10)) {
      const text = await cell.textContent();
      const className = await cell.getAttribute('class');
      
      if (text && text.includes('분')) {
        const delayMinutes = parseInt(text.replace('분', ''));
        if (delayMinutes >= 15 && className?.includes('text-red')) {
          hasRedDelay = true;
        } else if (delayMinutes < 5 && className?.includes('text-green')) {
          hasGreenDelay = true;
        }
      }
    }
    
    console.log(`[Playwright] Delay colors - Red (15+min): ${hasRedDelay}, Green (<5min): ${hasGreenDelay}`);
    expect(hasRedDelay || hasGreenDelay).toBe(true);
  });

  test('should display real data with delay status and red color', async ({ page }) => {
    // Open modal
    await page.locator('button[title="항공편 정보"]').click();
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for rows with '지연' status
    const delayedRows = await page.locator('tr:has-text("지연")').count();
    console.log(`[Playwright] Found ${delayedRows} rows with '지연' status`);
    expect(delayedRows).toBeGreaterThan(0);
    
    // Check for red colored delay time (15+ minutes)
    const delayCell = await page.locator('td:has-text("15")').first();
    const delayCellClass = await delayCell.getAttribute('class');
    console.log(`[Playwright] Delay cell class: ${delayCellClass}`);
    
    // Check if it has red color
    if (delayCellClass) {
      expect(delayCellClass).toContain('text-red');
    } else {
      // Alternative: check computed style
      const color = await delayCell.evaluate(el => window.getComputedStyle(el).color);
      console.log(`[Playwright] Delay cell computed color: ${color}`);
      expect(color).toContain('rgb(220'); // Red color
    }
    
    // Verify data structure
    const firstRow = await page.locator('tbody tr').first();
    const flightNo = await firstRow.locator('td').first().textContent();
    console.log(`[Playwright] First flight number: ${flightNo}`);
    expect(flightNo).toMatch(/^[A-Z]{2}\d+$/); // Format: XX1234
  });
});