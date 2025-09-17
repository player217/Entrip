import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  defaultPassword: 'pass1234',
  timeout: 30000,
  slowMo: 500,
};

// Demo accounts for all companies
const DEMO_ACCOUNTS = {
  J1: [
    { email: 'admin@j1.com', role: 'admin' },
    { email: 'manager@j1.com', role: 'manager' },
    { email: 'user1@j1.com', role: 'user' },
    { email: 'user2@j1.com', role: 'user' },
  ],
  HAPPY: [
    { email: 'admin@happy.com', role: 'admin' },
    { email: 'manager@happy.com', role: 'manager' },
    { email: 'user@happy.com', role: 'user' },
  ],
  STAR: [
    { email: 'admin@star.com', role: 'admin' },
    { email: 'manager@star.com', role: 'manager' },
    { email: 'user@star.com', role: 'user' },
  ],
  ENTRIP_MAIN: [
    { email: 'admin@entrip.com', role: 'admin' },
    { email: 'manager@entrip.com', role: 'manager' },
    { email: 'user@entrip.com', role: 'user' },
  ],
};

// Booking view pages to test
const BOOKING_PAGES = [
  { path: '/calendar-monthly', name: 'Monthly Calendar View' },
  { path: '/calendar-weekly', name: 'Weekly Calendar View' },
  { path: '/list-monthly', name: 'Monthly List View' },
  { path: '/list-weekly', name: 'Weekly List View' },
];

// Expected data distribution (September 2025)
const EXPECTED_DATA = {
  J1: 151,
  HAPPY: 150,
  STAR: 183,
  ENTRIP_MAIN: 50,
  total: 534
};

interface TestResults {
  companyCode: string;
  email: string;
  role: string;
  loginSuccess: boolean;
  loginError?: string;
  pageResults: Array<{
    pageName: string;
    path: string;
    accessible: boolean;
    bookingsCount: number;
    error?: string;
    screenshot?: string;
  }>;
  dataIsolationValid: boolean;
}

// Helper function to perform login
async function performLogin(page: Page, email: string, password: string = TEST_CONFIG.defaultPassword): Promise<{ success: boolean; error?: string }> {
  try {
    // Navigate to login page
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if already logged in by looking for redirect to main page
    const currentUrl = page.url();
    if (currentUrl.includes('/workspace') || currentUrl.includes('/calendar')) {
      return { success: true };
    }

    // Find and fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(email);
    await passwordInput.fill(password);
    
    // Submit login
    await loginButton.click();

    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check for successful login (should redirect away from login page)
    const finalUrl = page.url();
    if (finalUrl.includes('/login')) {
      // Still on login page, check for error messages
      const errorElement = page.locator('.error, .text-red-500, [role="alert"]').first();
      const errorText = await errorElement.textContent().catch(() => null);
      return { 
        success: false, 
        error: errorText || 'Login failed - remained on login page' 
      };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: `Login failed with exception: ${error.message}` 
    };
  }
}

// Helper function to count visible bookings on a page
async function countBookings(page: Page): Promise<number> {
  try {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Common selectors for booking items across different views
    const bookingSelectors = [
      '[data-testid*="booking"]',
      '.booking-item',
      '.booking-card',
      '.calendar-event',
      '.reservation-item',
      '.booking-entry',
      // More specific selectors for different views
      '.monthly-calendar .booking',
      '.weekly-calendar .booking',
      '.list-view .booking',
      'tbody tr', // for table views
    ];

    let maxCount = 0;

    for (const selector of bookingSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const count = await page.locator(selector).count();
        maxCount = Math.max(maxCount, count);
      } catch (error) {
        // Selector not found, continue
        continue;
      }
    }

    // Also check for text indicators of bookings count
    const textCountSelectors = [
      ':text-matches("\\d+ 건", "i")',
      ':text-matches("\\d+ bookings?", "i")',
      ':text-matches("총 \\d+", "i")',
    ];

    for (const selector of textCountSelectors) {
      try {
        const element = page.locator(selector).first();
        const text = await element.textContent({ timeout: 2000 });
        const match = text?.match(/(\d+)/);
        if (match) {
          const extractedCount = parseInt(match[1]);
          maxCount = Math.max(maxCount, extractedCount);
        }
      } catch (error) {
        continue;
      }
    }

    return maxCount;
  } catch (error) {
    console.warn(`Error counting bookings: ${error.message}`);
    return 0;
  }
}

// Main test suite
test.describe('Authentication and Data Isolation Testing', () => {
  let testResults: TestResults[] = [];

  test.beforeAll(async () => {
    console.log('🧪 Starting comprehensive authentication and data isolation tests...');
    console.log(`📊 Testing ${Object.values(DEMO_ACCOUNTS).flat().length} demo accounts across 4 companies`);
    console.log(`📄 Testing ${BOOKING_PAGES.length} booking view pages per account`);
  });

  for (const [companyCode, accounts] of Object.entries(DEMO_ACCOUNTS)) {
    test.describe(`Company: ${companyCode}`, () => {
      for (const account of accounts) {
        test(`${companyCode} - ${account.email} (${account.role})`, async ({ page, browser }) => {
          const testResult: TestResults = {
            companyCode,
            email: account.email,
            role: account.role,
            loginSuccess: false,
            pageResults: [],
            dataIsolationValid: false,
          };

          try {
            // Step 1: Perform login
            console.log(`🔐 Testing login for ${account.email}...`);
            const loginResult = await performLogin(page, account.email);
            
            testResult.loginSuccess = loginResult.success;
            if (!loginResult.success) {
              testResult.loginError = loginResult.error;
              testResults.push(testResult);
              throw new Error(`Login failed: ${loginResult.error}`);
            }

            console.log(`✅ Login successful for ${account.email}`);

            // Step 2: Test each booking view page
            for (const bookingPage of BOOKING_PAGES) {
              console.log(`📄 Testing page: ${bookingPage.name} for ${account.email}...`);
              
              const pageResult = {
                pageName: bookingPage.name,
                path: bookingPage.path,
                accessible: false,
                bookingsCount: 0,
                error: undefined as string | undefined,
                screenshot: undefined as string | undefined,
              };

              try {
                // Navigate to the page
                await page.goto(bookingPage.path, { waitUntil: 'networkidle', timeout: 15000 });
                
                // Check if page is accessible (not redirected to login or error page)
                const currentUrl = page.url();
                if (currentUrl.includes('/login') || currentUrl.includes('/error')) {
                  pageResult.accessible = false;
                  pageResult.error = `Redirected to ${currentUrl}`;
                } else {
                  pageResult.accessible = true;
                  
                  // Count bookings on this page
                  pageResult.bookingsCount = await countBookings(page);
                  
                  // Take screenshot for verification
                  const screenshotPath = `test-results/screenshots/${companyCode}-${account.role}-${bookingPage.name.replace(/\s+/g, '-')}.png`;
                  await page.screenshot({ 
                    path: screenshotPath,
                    fullPage: true 
                  });
                  pageResult.screenshot = screenshotPath;

                  console.log(`📊 ${bookingPage.name}: ${pageResult.bookingsCount} bookings found`);
                }
              } catch (error) {
                pageResult.accessible = false;
                pageResult.error = `Page navigation failed: ${error.message}`;
              }

              testResult.pageResults.push(pageResult);
            }

            // Step 3: Validate data isolation
            const totalBookingsFound = Math.max(...testResult.pageResults.map(p => p.bookingsCount));
            const expectedForCompany = EXPECTED_DATA[companyCode as keyof typeof EXPECTED_DATA];
            
            // Data isolation is valid if:
            // 1. User can access pages
            // 2. Sees reasonable number of bookings (not all companies' data)
            // 3. Number is roughly in expected range (allowing for some variance)
            testResult.dataIsolationValid = 
              testResult.pageResults.some(p => p.accessible) &&
              totalBookingsFound > 0 &&
              totalBookingsFound <= expectedForCompany * 1.5; // Allow 50% variance

            console.log(`🔒 Data isolation check: ${testResult.dataIsolationValid ? 'PASS' : 'FAIL'}`);
            console.log(`📈 Max bookings found: ${totalBookingsFound}, Expected: ~${expectedForCompany}`);

          } catch (error) {
            console.error(`❌ Test failed for ${account.email}: ${error.message}`);
            testResult.loginError = error.message;
          } finally {
            testResults.push(testResult);
            
            // Logout for next test
            try {
              await page.goto('/login', { timeout: 5000 });
              await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
              });
            } catch (error) {
              // Ignore logout errors
            }
          }

          // Assertions for test reporting
          expect(testResult.loginSuccess, `Login should succeed for ${account.email}`).toBe(true);
          expect(testResult.pageResults.some(p => p.accessible), `At least one page should be accessible for ${account.email}`).toBe(true);
          expect(testResult.dataIsolationValid, `Data isolation should be valid for ${account.email}`).toBe(true);
        });
      }
    });
  }

  test.afterAll(async () => {
    // Generate comprehensive test report
    const report = generateTestReport(testResults);
    
    // Write report to file
    const reportPath = 'test-results/comprehensive-auth-data-isolation-report.json';
    const fs = require('fs');
    const path = require('path');
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 Test Report Generated:');
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(`📁 Full report saved to: ${reportPath}`);
  });
});

function generateTestReport(results: TestResults[]) {
  const summary = {
    totalAccounts: results.length,
    successfulLogins: results.filter(r => r.loginSuccess).length,
    failedLogins: results.filter(r => !r.loginSuccess).length,
    dataIsolationPassed: results.filter(r => r.dataIsolationValid).length,
    dataIsolationFailed: results.filter(r => !r.dataIsolationValid).length,
    companiesTest: Object.keys(DEMO_ACCOUNTS).length,
    pagesTestedPerAccount: BOOKING_PAGES.length,
    totalPageTests: results.reduce((sum, r) => sum + r.pageResults.length, 0),
    accessiblePageTests: results.reduce((sum, r) => sum + r.pageResults.filter(p => p.accessible).length, 0),
  };

  const byCompany = Object.keys(DEMO_ACCOUNTS).reduce((acc, company) => {
    const companyResults = results.filter(r => r.companyCode === company);
    acc[company] = {
      accountsTested: companyResults.length,
      successfulLogins: companyResults.filter(r => r.loginSuccess).length,
      dataIsolationValid: companyResults.filter(r => r.dataIsolationValid).length,
      averageBookingsFound: Math.round(
        companyResults.reduce((sum, r) => {
          const maxBookings = Math.max(...r.pageResults.map(p => p.bookingsCount));
          return sum + maxBookings;
        }, 0) / companyResults.length
      ),
      expectedBookings: EXPECTED_DATA[company as keyof typeof EXPECTED_DATA],
    };
    return acc;
  }, {} as Record<string, any>);

  const detailedResults = results.map(result => ({
    ...result,
    summary: {
      loginSuccess: result.loginSuccess,
      accessiblePages: result.pageResults.filter(p => p.accessible).length,
      totalPages: result.pageResults.length,
      maxBookingsFound: Math.max(...result.pageResults.map(p => p.bookingsCount), 0),
      dataIsolationValid: result.dataIsolationValid,
    }
  }));

  return {
    timestamp: new Date().toISOString(),
    testConfiguration: {
      baseURL: TEST_CONFIG.baseURL,
      companiesTested: Object.keys(DEMO_ACCOUNTS),
      accountsPerCompany: Object.entries(DEMO_ACCOUNTS).map(([company, accounts]) => ({
        company,
        count: accounts.length
      })),
      pagesTestedPerAccount: BOOKING_PAGES,
      expectedDataDistribution: EXPECTED_DATA,
    },
    summary,
    byCompany,
    detailedResults,
  };
}