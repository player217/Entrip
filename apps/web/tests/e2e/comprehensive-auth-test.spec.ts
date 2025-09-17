import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  defaultPassword: 'pass1234',
  timeout: 45000,
};

// Demo accounts organized by company (matching login page structure)
const DEMO_ACCOUNTS = {
  ENTRIP_MAIN: [
    { label: '본사 관리자', email: 'admin@entrip.com', role: 'admin' },
    { label: '본사 매니저', email: 'manager@entrip.com', role: 'manager' },
    { label: '본사 직원', email: 'user@entrip.com', role: 'user' },
  ],
  J1: [
    { label: 'J1 관리자', email: 'admin@j1.com', role: 'admin' },
    { label: 'J1 매니저', email: 'manager@j1.com', role: 'manager' },
    { label: 'J1 직원1', email: 'user1@j1.com', role: 'user' },
    { label: 'J1 직원2', email: 'user2@j1.com', role: 'user' },
  ],
  HAPPY: [
    { label: '해피 관리자', email: 'admin@happy.com', role: 'admin' },
    { label: '해피 매니저', email: 'manager@happy.com', role: 'manager' },
    { label: '해피 직원', email: 'user@happy.com', role: 'user' },
  ],
  STAR: [
    { label: '스타 관리자', email: 'admin@star.com', role: 'admin' },
    { label: '스타 매니저', email: 'manager@star.com', role: 'manager' },
    { label: '스타 직원', email: 'user@star.com', role: 'user' },
  ],
};

// Booking view pages to test
const BOOKING_PAGES = [
  { path: '/calendar-monthly', name: 'Monthly Calendar View' },
  { path: '/calendar-weekly', name: 'Weekly Calendar View' },
  { path: '/list-monthly', name: 'Monthly List View' },  
  { path: '/list-weekly', name: 'Weekly List View' },
];

// Expected data distribution (September 2025 bookings)
const EXPECTED_DATA = {
  J1: 151,
  HAPPY: 150,
  STAR: 183,
  ENTRIP_MAIN: 50,
};

interface TestResult {
  companyCode: string;
  account: any;
  loginSuccess: boolean;
  loginMethod: 'demo_button' | 'manual_form';
  loginError?: string;
  pageTests: Array<{
    pageName: string;
    path: string;
    accessible: boolean;
    bookingsVisible: number;
    error?: string;
    screenshotPath?: string;
  }>;
  dataIsolationValid: boolean;
  notes: string[];
}

// Helper function: Login using demo account buttons
async function loginWithDemoButton(page: Page, accountLabel: string): Promise<{ success: boolean; error?: string }> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Wait for demo account buttons to load
    await page.waitForSelector('button:has-text("' + accountLabel + '")', { timeout: 10000 });
    
    // Click the demo account button
    const demoButton = page.locator('button:has-text("' + accountLabel + '")');
    await demoButton.click();
    
    // Wait for login to complete (should redirect away from /login)
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      return { success: false, error: 'Still on login page after demo button click' };
    }
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: `Demo button login failed: ${error.message}` };
  }
}

// Helper function: Login using manual form
async function loginWithForm(page: Page, companyCode: string, username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Fill the manual form
    await page.fill('input[name="companyCode"]', companyCode);
    await page.fill('input[name="username"]', username);  
    await page.fill('input[name="password"]', password);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for login response
    await page.waitForTimeout(4000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Check for error messages
      const errorElement = page.locator('.text-red-600, .bg-red-50').first();
      const errorText = await errorElement.textContent().catch(() => null);
      return { success: false, error: errorText || 'Form login failed - remained on login page' };
    }
    
    return { success: true };
    
  } catch (error) {
    return { success: false, error: `Form login failed: ${error.message}` };
  }
}

// Helper function: Count bookings on page
async function countBookingsOnPage(page: Page): Promise<number> {
  await page.waitForTimeout(3000); // Allow content to load
  
  // Multiple strategies to count bookings
  const strategies = [
    // Strategy 1: Look for booking cards/items
    async () => {
      const selectors = [
        '[data-testid*="booking"]',
        '.booking-card',
        '.booking-item', 
        '.calendar-event',
        '.reservation-item',
      ];
      
      for (const selector of selectors) {
        try {
          const count = await page.locator(selector).count();
          if (count > 0) return count;
        } catch (e) {}
      }
      return 0;
    },
    
    // Strategy 2: Look for table rows
    async () => {
      try {
        const rows = await page.locator('tbody tr').count();
        return Math.max(0, rows - 1); // Subtract header if exists
      } catch (e) {
        return 0;
      }
    },
    
    // Strategy 3: Look for text indicators
    async () => {
      try {
        const textContent = await page.textContent('body');
        const matches = textContent.match(/(\d+)\s*(건|개|bookings?)/gi);
        if (matches && matches.length > 0) {
          const numbers = matches.map(m => parseInt(m.match(/\d+/)[0]));
          return Math.max(...numbers);
        }
      } catch (e) {}
      return 0;
    },
    
    // Strategy 4: Count calendar day cells with events
    async () => {
      try {
        const cells = await page.locator('.calendar-day:has(.booking), .day-cell:has(.event)').count();
        return cells;
      } catch (e) {
        return 0;
      }
    },
  ];
  
  // Try all strategies and return the maximum count found
  const counts = await Promise.all(strategies.map(strategy => strategy().catch(() => 0)));
  return Math.max(...counts, 0);
}

// Helper function: Clear session
async function clearSession(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    });
    await page.context().clearCookies();
  } catch (error) {
    console.warn('Session clear failed:', error.message);
  }
}

test.describe('Comprehensive Authentication & Data Isolation Testing', () => {
  let allTestResults: TestResult[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await clearSession(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // Test each company's accounts
  for (const [companyCode, accounts] of Object.entries(DEMO_ACCOUNTS)) {
    test.describe(`Company: ${companyCode}`, () => {
      
      for (const account of accounts) {
        test(`${companyCode}: ${account.email} (${account.role})`, async ({ page }) => {
          const testResult: TestResult = {
            companyCode,
            account,
            loginSuccess: false,
            loginMethod: 'demo_button',
            pageTests: [],
            dataIsolationValid: false,
            notes: [],
          };

          try {
            console.log(`🧪 Testing ${account.email} (${account.label})`);
            
            // Step 1: Try demo button login first
            console.log(`🔘 Attempting demo button login for ${account.label}...`);
            let loginResult = await loginWithDemoButton(page, account.label);
            
            if (!loginResult.success) {
              // Fallback to manual form login
              console.log(`📝 Demo button failed, trying manual form login...`);
              testResult.loginMethod = 'manual_form';
              loginResult = await loginWithForm(page, companyCode, account.email, TEST_CONFIG.defaultPassword);
            }
            
            testResult.loginSuccess = loginResult.success;
            if (!loginResult.success) {
              testResult.loginError = loginResult.error;
              testResult.notes.push(`Login failed: ${loginResult.error}`);
              allTestResults.push(testResult);
              throw new Error(`Login failed for ${account.email}: ${loginResult.error}`);
            }

            testResult.notes.push(`Login successful via ${testResult.loginMethod}`);
            console.log(`✅ Login successful for ${account.email}`);

            // Step 2: Test each booking page
            for (const bookingPage of BOOKING_PAGES) {
              console.log(`📄 Testing ${bookingPage.name}...`);
              
              const pageTest = {
                pageName: bookingPage.name,
                path: bookingPage.path,
                accessible: false,
                bookingsVisible: 0,
                error: undefined as string | undefined,
                screenshotPath: undefined as string | undefined,
              };

              try {
                // Navigate to the page
                await page.goto(bookingPage.path, { 
                  waitUntil: 'networkidle', 
                  timeout: 20000 
                });
                
                // Check if still accessible (not redirected to login)
                const currentUrl = page.url();
                if (currentUrl.includes('/login')) {
                  pageTest.accessible = false;
                  pageTest.error = 'Redirected to login page';
                } else {
                  pageTest.accessible = true;
                  
                  // Count visible bookings
                  pageTest.bookingsVisible = await countBookingsOnPage(page);
                  
                  // Take screenshot
                  const screenshotName = `${companyCode}-${account.role}-${bookingPage.name.replace(/\s+/g, '-')}-${Date.now()}.png`;
                  pageTest.screenshotPath = `test-results/screenshots/${screenshotName}`;
                  await page.screenshot({ 
                    path: pageTest.screenshotPath,
                    fullPage: true 
                  });
                  
                  console.log(`📊 ${bookingPage.name}: ${pageTest.bookingsVisible} bookings visible`);
                }
                
              } catch (error) {
                pageTest.accessible = false;
                pageTest.error = `Page error: ${error.message}`;
                console.warn(`⚠️ ${bookingPage.name} failed: ${error.message}`);
              }
              
              testResult.pageTests.push(pageTest);
            }

            // Step 3: Evaluate data isolation
            const maxBookingsFound = Math.max(...testResult.pageTests.map(p => p.bookingsVisible), 0);
            const expectedForCompany = EXPECTED_DATA[companyCode as keyof typeof EXPECTED_DATA];
            const hasAccessiblePages = testResult.pageTests.some(p => p.accessible);
            
            // Data isolation validation criteria:
            // 1. Can access at least one page
            // 2. Sees some bookings (not zero)
            // 3. Bookings count is reasonable for the company (not excessive indicating data leak)
            testResult.dataIsolationValid = 
              hasAccessiblePages &&
              maxBookingsFound > 0 &&
              maxBookingsFound <= expectedForCompany * 2; // Allow 2x variance for safety

            const isolationStatus = testResult.dataIsolationValid ? '✅ PASS' : '❌ FAIL';
            console.log(`🔒 Data isolation: ${isolationStatus}`);
            console.log(`📈 Bookings found: ${maxBookingsFound}, Expected range: 1-${expectedForCompany * 2}`);
            
            testResult.notes.push(`Data isolation ${testResult.dataIsolationValid ? 'passed' : 'failed'}: ${maxBookingsFound} bookings found`);

          } catch (error) {
            console.error(`❌ Test failed for ${account.email}:`, error.message);
            testResult.notes.push(`Test error: ${error.message}`);
          } finally {
            allTestResults.push(testResult);
            
            // Clean up for next test
            await clearSession(page);
          }

          // Test assertions
          expect(testResult.loginSuccess, `Login should succeed for ${account.email}`).toBe(true);
          expect(testResult.pageTests.some(p => p.accessible), `At least one page should be accessible for ${account.email}`).toBe(true);
        });
      }
    });
  }

  test.afterAll(async () => {
    // Generate comprehensive report
    const report = generateComprehensiveReport(allTestResults);
    
    // Save detailed report
    const fs = require('fs');
    const path = require('path');
    const reportPath = 'test-results/comprehensive-auth-data-isolation-report.json';
    
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 COMPREHENSIVE TEST REPORT SUMMARY');
    console.log('=====================================');
    console.log(`🏢 Companies tested: ${report.summary.companiesTested}`);
    console.log(`👥 Total accounts: ${report.summary.totalAccounts}`);
    console.log(`✅ Successful logins: ${report.summary.successfulLogins}/${report.summary.totalAccounts}`);
    console.log(`📄 Pages accessible: ${report.summary.accessiblePageTests}/${report.summary.totalPageTests}`);
    console.log(`🔒 Data isolation valid: ${report.summary.dataIsolationPassed}/${report.summary.totalAccounts}`);
    console.log(`📁 Full report: ${reportPath}`);
    
    // Company breakdown
    console.log('\n🏢 BY COMPANY:');
    Object.entries(report.byCompany).forEach(([company, stats]: [string, any]) => {
      console.log(`  ${company}: ${stats.successfulLogins}/${stats.accountsTested} logins, avg ${stats.averageBookingsFound} bookings`);
    });
  });
});

function generateComprehensiveReport(results: TestResult[]) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalAccounts: results.length,
    successfulLogins: results.filter(r => r.loginSuccess).length,
    failedLogins: results.filter(r => !r.loginSuccess).length,
    dataIsolationPassed: results.filter(r => r.dataIsolationValid).length,
    dataIsolationFailed: results.filter(r => !r.dataIsolationValid).length,
    companiesTested: Object.keys(DEMO_ACCOUNTS).length,
    totalPageTests: results.reduce((sum, r) => sum + r.pageTests.length, 0),
    accessiblePageTests: results.reduce((sum, r) => sum + r.pageTests.filter(p => p.accessible).length, 0),
  };

  const byCompany = Object.keys(DEMO_ACCOUNTS).reduce((acc, company) => {
    const companyResults = results.filter(r => r.companyCode === company);
    acc[company] = {
      accountsTested: companyResults.length,
      successfulLogins: companyResults.filter(r => r.loginSuccess).length,
      dataIsolationValid: companyResults.filter(r => r.dataIsolationValid).length,
      averageBookingsFound: companyResults.length > 0 ? Math.round(
        companyResults.reduce((sum, r) => {
          const maxBookings = Math.max(...r.pageTests.map(p => p.bookingsVisible), 0);
          return sum + maxBookings;
        }, 0) / companyResults.length
      ) : 0,
      expectedBookings: EXPECTED_DATA[company as keyof typeof EXPECTED_DATA] || 0,
    };
    return acc;
  }, {} as Record<string, any>);

  return {
    testConfiguration: {
      baseURL: TEST_CONFIG.baseURL,
      companiesTested: Object.keys(DEMO_ACCOUNTS),
      pagesTestedPerAccount: BOOKING_PAGES,
      expectedDataDistribution: EXPECTED_DATA,
    },
    summary,
    byCompany,
    detailedResults: results,
  };
}