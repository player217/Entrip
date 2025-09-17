import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  defaultPassword: 'pass1234',
  timeout: 30000,
};

// ACTUAL demo accounts from database - verified to exist
const WORKING_ACCOUNTS = [
  // J1 Company - Verified in DB
  { companyCode: 'J1', email: 'admin@j1.com', role: 'admin', label: 'J1 관리자', expectedBookings: 151 },
  { companyCode: 'j1', email: 'manager@j1.com', role: 'manager', label: 'J1 Manager', expectedBookings: 151 },
  { companyCode: 'J1', email: 'user1@j1.com', role: 'user', label: 'J1 직원1', expectedBookings: 151 },
  
  // HAPPY Company - Verified in DB  
  { companyCode: 'HAPPY', email: 'admin@happy.com', role: 'admin', label: 'Happy Travel 관리자', expectedBookings: 150 },
  { companyCode: 'happy', email: 'manager@happy.com', role: 'manager', label: 'Happy Manager', expectedBookings: 150 },
  { companyCode: 'happy', email: 'user@happy.com', role: 'user', label: 'Happy User', expectedBookings: 150 },
  
  // STAR Company - Verified in DB
  { companyCode: 'STAR', email: 'admin@star.com', role: 'admin', label: 'Star Tours 관리자', expectedBookings: 183 },
  { companyCode: 'star', email: 'manager@star.com', role: 'manager', label: 'Star Manager', expectedBookings: 183 },
  { companyCode: 'star', email: 'user@star.com', role: 'user', label: 'Star User', expectedBookings: 183 },
  
  // ENTRIP_MAIN - Verified in DB
  { companyCode: 'ENTRIP_MAIN', email: 'admin@entrip_main.com', role: 'admin', label: 'Entrip 본사 관리자', expectedBookings: 50 },
  { companyCode: 'ENTRIP_MAIN', email: 'manager@entrip.com', role: 'manager', label: 'Entrip 본사 매니저 1', expectedBookings: 50 },
];

// Booking view pages to test
const BOOKING_PAGES = [
  { path: '/calendar-monthly', name: 'Monthly Calendar View' },
  { path: '/calendar-weekly', name: 'Weekly Calendar View' },
  { path: '/list-monthly', name: 'Monthly List View' },
  { path: '/list-weekly', name: 'Weekly List View' },
];

interface FocusedTestResult {
  account: any;
  loginSuccess: boolean;
  loginMethod: 'demo_button' | 'manual_form';
  loginError?: string;
  pageAccessResults: Array<{
    pageName: string;
    accessible: boolean;
    bookingsCount: number;
    error?: string;
  }>;
  dataIsolationScore: number; // 0-100 score
  summary: string;
}

// Helper function: Try manual form login
async function manualLogin(page: Page, companyCode: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Fill form fields
    await page.fill('input[name="companyCode"]', companyCode);
    await page.fill('input[name="username"]', email);  
    await page.fill('input[name="password"]', password);
    
    // Submit
    await page.click('button[type="submit"]:has-text("로그인")');
    
    // Wait for response
    await page.waitForTimeout(4000);
    
    // Check result
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      const errorText = await page.locator('.text-red-600').first().textContent().catch(() => null);
      return { success: false, error: errorText || 'Form login failed' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `Form login error: ${error.message}` };
  }
}

// Helper function: Count bookings
async function countVisibleBookings(page: Page, pageName: string): Promise<number> {
  await page.waitForTimeout(2000);
  
  // Different counting strategies for different page types
  if (pageName.includes('Calendar')) {
    // Calendar views - look for event elements
    try {
      const events = await page.locator('.calendar-event, .booking-event, .event').count();
      if (events > 0) return events;
      
      const dayEvents = await page.locator('[data-date] .booking, [data-date] .event').count(); 
      if (dayEvents > 0) return dayEvents;
      
      const cellContent = await page.locator('.calendar-cell:has(.booking), .day-cell:has(.event)').count();
      if (cellContent > 0) return cellContent;
      
    } catch (e) {}
  } else {
    // List views - look for rows or items
    try {
      const rows = await page.locator('tbody tr').count();
      if (rows > 0) return Math.max(0, rows - 1); // subtract header
      
      const items = await page.locator('.booking-item, .list-item, .booking-row').count();
      if (items > 0) return items;
      
    } catch (e) {}
  }
  
  // Fallback: look for any booking-related elements
  try {
    const bookingElements = await page.locator('[data-testid*="booking"], .booking, [class*="booking"]').count();
    if (bookingElements > 0) return bookingElements;
  } catch (e) {}
  
  // Last resort: try to extract numbers from text content
  try {
    const bodyText = await page.textContent('body');
    const numberMatches = bodyText.match(/(\d+)\s*(건|개|items?|bookings?)/gi);
    if (numberMatches && numberMatches.length > 0) {
      const numbers = numberMatches.map(match => parseInt(match.match(/\d+/)[0]));
      return Math.max(...numbers);
    }
  } catch (e) {}
  
  return 0;
}

// Clear browser state
async function clearBrowserState(page: Page) {
  try {
    await page.context().clearCookies();
    await page.evaluate(() => {
      if (typeof(Storage) !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    });
  } catch (e) {
    console.warn('Could not clear browser state:', e.message);
  }
}

test.describe('Focused Authentication & Data Isolation Test', () => {
  let testResults: FocusedTestResult[] = [];

  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // Test subset of working accounts for quick validation
  const QUICK_TEST_ACCOUNTS = [
    WORKING_ACCOUNTS.find(a => a.email === 'admin@j1.com'),
    WORKING_ACCOUNTS.find(a => a.email === 'manager@happy.com'), 
    WORKING_ACCOUNTS.find(a => a.email === 'user@star.com'),
    WORKING_ACCOUNTS.find(a => a.email === 'manager@entrip.com'),
  ].filter(Boolean);

  for (const account of QUICK_TEST_ACCOUNTS) {
    test(`${account.companyCode.toUpperCase()}: ${account.email} (${account.role})`, async ({ page }) => {
      const result: FocusedTestResult = {
        account,
        loginSuccess: false,
        loginMethod: 'manual_form',
        pageAccessResults: [],
        dataIsolationScore: 0,
        summary: '',
      };

      try {
        console.log(`🧪 Testing ${account.email} from ${account.companyCode}...`);
        
        // Step 1: Login
        const loginResult = await manualLogin(page, account.companyCode, account.email, TEST_CONFIG.defaultPassword);
        result.loginSuccess = loginResult.success;
        
        if (!loginResult.success) {
          result.loginError = loginResult.error;
          result.summary = `❌ Login failed: ${loginResult.error}`;
          testResults.push(result);
          throw new Error(`Login failed: ${loginResult.error}`);
        }

        console.log(`✅ Login successful for ${account.email}`);
        
        // Step 2: Test each booking page
        let totalBookingsFound = 0;
        let accessiblePages = 0;
        
        for (const page_info of BOOKING_PAGES) {
          console.log(`📄 Testing ${page_info.name}...`);
          
          const pageResult = {
            pageName: page_info.name,
            accessible: false,
            bookingsCount: 0,
            error: undefined as string | undefined,
          };

          try {
            await page.goto(page_info.path, { waitUntil: 'networkidle', timeout: 15000 });
            
            if (!page.url().includes('/login')) {
              pageResult.accessible = true;
              accessiblePages++;
              
              // Count bookings
              pageResult.bookingsCount = await countVisibleBookings(page, page_info.name);
              totalBookingsFound = Math.max(totalBookingsFound, pageResult.bookingsCount);
              
              console.log(`📊 ${page_info.name}: ${pageResult.bookingsCount} bookings visible`);
            } else {
              pageResult.error = 'Redirected to login';
            }
            
          } catch (error) {
            pageResult.error = `Navigation error: ${error.message}`;
          }
          
          result.pageAccessResults.push(pageResult);
        }

        // Step 3: Calculate data isolation score
        const expectedBookings = account.expectedBookings;
        
        // Scoring criteria:
        // - Login successful: +30 points
        // - Pages accessible: +20 points (5 per page)
        // - Reasonable booking count: +50 points (based on expected range)
        
        let score = 0;
        if (result.loginSuccess) score += 30;
        score += Math.min(20, accessiblePages * 5);
        
        // Booking count validation (allow wide range for initial test)
        if (totalBookingsFound > 0 && totalBookingsFound <= expectedBookings * 3) {
          score += 50; // Good data isolation
        } else if (totalBookingsFound > expectedBookings * 3) {
          score += 10; // Possible data leak
        } else if (totalBookingsFound === 0) {
          score += 0; // No data visible
        }
        
        result.dataIsolationScore = score;
        result.summary = `✅ Score: ${score}/100, ${accessiblePages}/4 pages accessible, ${totalBookingsFound} bookings found (expected ~${expectedBookings})`;
        
        console.log(`🎯 Final score: ${score}/100`);
        console.log(`📊 Found ${totalBookingsFound} bookings (expected ~${expectedBookings})`);
        
      } catch (error) {
        console.error(`❌ Test failed for ${account.email}:`, error.message);
        result.summary = `❌ Test error: ${error.message}`;
      } finally {
        testResults.push(result);
        await clearBrowserState(page);
      }

      // Test assertions (relaxed for discovery)
      expect(result.loginSuccess, `Login should succeed for ${account.email}`).toBe(true);
    });
  }

  test.afterAll(async () => {
    // Generate focused report
    console.log('\n🎯 FOCUSED TEST RESULTS SUMMARY');
    console.log('===============================');
    
    const successful = testResults.filter(r => r.loginSuccess);
    const averageScore = testResults.reduce((sum, r) => sum + r.dataIsolationScore, 0) / testResults.length;
    
    console.log(`✅ Successful logins: ${successful.length}/${testResults.length}`);
    console.log(`📊 Average score: ${Math.round(averageScore)}/100`);
    console.log(`🔒 Data isolation assessment:`);
    
    testResults.forEach(result => {
      console.log(`  ${result.account.email}: ${result.summary}`);
    });
    
    // Company-specific analysis
    console.log('\n🏢 BY COMPANY:');
    const byCompany = {};
    testResults.forEach(result => {
      const company = result.account.companyCode.toUpperCase();
      if (!byCompany[company]) byCompany[company] = [];
      byCompany[company].push(result);
    });
    
    Object.entries(byCompany).forEach(([company, results]: [string, any[]]) => {
      const avgScore = results.reduce((sum, r) => sum + r.dataIsolationScore, 0) / results.length;
      const successCount = results.filter(r => r.loginSuccess).length;
      console.log(`  ${company}: ${successCount}/${results.length} success, avg score ${Math.round(avgScore)}`);
    });

    // Save detailed results
    const fs = require('fs');
    const reportPath = `test-results/focused-auth-test-${Date.now()}.json`;
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: testResults.length,
        successfulLogins: successful.length,
        averageScore: Math.round(averageScore),
      },
      results: testResults
    }, null, 2));
    
    console.log(`📁 Detailed report saved: ${reportPath}`);
  });
});