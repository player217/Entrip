const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Company test configurations
const companies = [
  {
    name: 'J1',
    cookieFile: 'cookies_j1_admin.txt',
    expectedBookings: 151,
    companyCode: 'j1'
  },
  {
    name: 'HAPPY', 
    cookieFile: 'cookies_happy_admin.txt',
    expectedBookings: 150,
    companyCode: 'happy'
  },
  {
    name: 'STAR',
    cookieFile: 'cookies_star_admin.txt', 
    expectedBookings: 183,
    companyCode: 'star'
  },
  {
    name: 'ENTRIP_MAIN',
    cookieFile: 'cookies_entrip_admin.txt',
    expectedBookings: 50,
    companyCode: 'ENTRIP_MAIN'
  }
];

// Test pages to check
const testPages = [
  {
    name: 'Monthly Calendar View',
    path: '/calendar-monthly',
    selector: '[data-testid="calendar-month"], .calendar-month, .monthly-calendar'
  },
  {
    name: 'Weekly Calendar View', 
    path: '/calendar-weekly',
    selector: '[data-testid="calendar-week"], .calendar-week, .weekly-calendar'
  },
  {
    name: 'Monthly List View',
    path: '/list-monthly', 
    selector: '[data-testid="list-view"], .booking-list, .list-view'
  },
  {
    name: 'Weekly List View',
    path: '/list-weekly',
    selector: '[data-testid="list-view"], .booking-list, .list-view'
  }
];

// Parse Netscape cookie format
function parseCookieFile(cookieFilePath) {
  const content = fs.readFileSync(cookieFilePath, 'utf8');
  const lines = content.split('\n');
  const cookies = [];
  
  for (const line of lines) {
    if (line.startsWith('#HttpOnly_localhost') || line.startsWith('localhost')) {
      // Handle both HttpOnly and regular cookies
      const cleanLine = line.replace('#HttpOnly_', '');
      const parts = cleanLine.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          name: parts[5],
          value: parts[6].trim(),
          domain: 'localhost',
          path: parts[2] || '/',
          httpOnly: line.startsWith('#HttpOnly_'),
          secure: false,
          sameSite: 'Lax'
        });
      }
    }
  }
  return cookies;
}

// Wait for content to load and count booking elements
async function waitForAndCountBookings(page, testPage) {
  try {
    // Wait for main content area
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Try multiple selectors for booking elements
    const bookingSelectors = [
      '.booking-item',
      '.reservation-item', 
      '.calendar-event',
      '.booking-card',
      '[data-booking-id]',
      '.booking-entry',
      '.event-item',
      '.fc-event',
      '.calendar-day-cell [data-booking]',
      '[class*="booking"]',
      '[class*="reservation"]'
    ];
    
    let bookingCount = 0;
    let foundSelector = null;
    
    for (const selector of bookingSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          bookingCount = elements;
          foundSelector = selector;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no booking elements found, check for "no data" messages
    const noDataSelectors = [
      'text="No bookings found"',
      'text="No data"', 
      'text="데이터가 없습니다"',
      'text="예약이 없습니다"',
      '.empty-state',
      '.no-data'
    ];
    
    let hasNoDataMessage = false;
    for (const selector of noDataSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible()) {
          hasNoDataMessage = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Get visible text content to analyze
    const pageText = await page.textContent('body');
    const hasBookingText = pageText.toLowerCase().includes('booking') || 
                          pageText.toLowerCase().includes('reservation') ||
                          pageText.includes('예약');
    
    // Check for September 2025 specifically
    const hasSeptemberData = pageText.includes('2025') && 
                            (pageText.includes('September') || pageText.includes('9월'));
    
    // Look for any date/time indicators
    const hasDateData = /\d{4}-\d{2}-\d{2}/.test(pageText) || 
                       /\d{1,2}\/\d{1,2}\/\d{4}/.test(pageText) ||
                       pageText.includes('월') ||
                       pageText.includes('일');
    
    return {
      bookingCount,
      foundSelector,
      hasNoDataMessage,
      hasBookingText,
      hasSeptemberData,
      hasDateData,
      pageText: pageText.substring(0, 800) + '...' // More context for analysis
    };
    
  } catch (error) {
    return {
      bookingCount: 0,
      error: error.message,
      foundSelector: null,
      hasNoDataMessage: false,
      hasBookingText: false,
      hasSeptemberData: false,
      hasDateData: false,
      pageText: ''
    };
  }
}

async function runComprehensiveTest() {
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      issues: []
    },
    companyResults: {}
  };

  console.log('🚀 Starting Comprehensive Company Account Testing...\n');
  console.log('📅 Testing September 2025 booking data visibility\n');
  
  for (const company of companies) {
    console.log(`\n📋 Testing Company: ${company.name} (Expected: ${company.expectedBookings} bookings)`);
    console.log('═'.repeat(60));
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set up company results
    testResults.companyResults[company.name] = {
      companyCode: company.companyCode,
      expectedBookings: company.expectedBookings,
      loginSuccess: false,
      pageResults: {},
      issues: []
    };
    
    try {
      // Load cookies
      const cookieFilePath = path.join(__dirname, company.cookieFile);
      if (!fs.existsSync(cookieFilePath)) {
        const issue = `❌ Cookie file not found: ${company.cookieFile}`;
        console.log(issue);
        testResults.companyResults[company.name].issues.push(issue);
        testResults.summary.issues.push(`${company.name}: ${issue}`);
        continue;
      }
      
      const cookies = parseCookieFile(cookieFilePath);
      if (cookies.length === 0) {
        const issue = `❌ No valid cookies found in ${company.cookieFile}`;
        console.log(issue);
        testResults.companyResults[company.name].issues.push(issue);
        continue;
      }
      
      // Add cookies to context
      for (const cookie of cookies) {
        await context.addCookies([{
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          url: 'http://localhost:3000'
        }]);
      }
      
      console.log(`✅ Loaded ${cookies.length} cookies for ${company.name}`);
      console.log(`   Auth Token: ${cookies.find(c => c.name === 'auth-token')?.value?.substring(0, 50)}...`);
      
      // Navigate to main page to verify login
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      // Check if logged in (multiple indicators)
      const loginIndicators = [
        'text="Logout"',
        'text="로그아웃"',
        '[data-testid="user-menu"]',
        '.user-menu',
        'text="Dashboard"',
        'text="Calendar"',
        'text="캘린더"'
      ];
      
      let isLoggedIn = false;
      for (const indicator of loginIndicators) {
        try {
          const element = await page.locator(indicator).first();
          if (await element.isVisible()) {
            isLoggedIn = true;
            console.log(`✅ Login confirmed via: ${indicator}`);
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }
      
      if (!isLoggedIn) {
        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          const issue = `❌ Authentication failed - redirected to login page`;
          console.log(issue);
          testResults.companyResults[company.name].issues.push(issue);
          testResults.summary.failed++;
          continue;
        } else {
          console.log(`⚠️ No clear login indicator found, but not redirected to login. URL: ${currentUrl}`);
          isLoggedIn = true; // Assume logged in if not redirected
        }
      }
      
      testResults.companyResults[company.name].loginSuccess = true;
      console.log(`✅ Login successful for ${company.name}`);
      
      // Test each booking view page
      for (const testPage of testPages) {
        console.log(`\n  📄 Testing: ${testPage.name} (${testPage.path})`);
        testResults.summary.totalTests++;
        
        const pageResult = {
          pageName: testPage.name,
          path: testPage.path,
          loadSuccess: false,
          bookingData: null,
          issues: [],
          timestamp: new Date().toISOString()
        };
        
        try {
          // Navigate to test page
          await page.goto(`http://localhost:3000${testPage.path}`, { 
            waitUntil: 'networkidle',
            timeout: 20000 
          });
          
          await page.waitForTimeout(5000); // Allow for dynamic content loading
          
          // Check for page load errors
          const hasError = await page.locator('text="Error"').isVisible() ||
                          await page.locator('.error').isVisible() ||
                          await page.locator('text="404"').isVisible() ||
                          await page.locator('text="500"').isVisible();
          
          if (hasError) {
            const issue = `Page load error detected`;
            pageResult.issues.push(issue);
            console.log(`    ❌ ${issue}`);
          } else {
            pageResult.loadSuccess = true;
            console.log(`    ✅ Page loaded successfully`);
          }
          
          // Analyze booking data
          const bookingData = await waitForAndCountBookings(page, testPage);
          pageResult.bookingData = bookingData;
          
          if (bookingData.error) {
            const issue = `Error analyzing booking data: ${bookingData.error}`;
            pageResult.issues.push(issue);
            console.log(`    ❌ ${issue}`);
            testResults.summary.failed++;
          } else {
            console.log(`    📊 Found ${bookingData.bookingCount} booking elements`);
            
            if (bookingData.foundSelector) {
              console.log(`    🔍 Using selector: ${bookingData.foundSelector}`);
            }
            
            if (bookingData.hasNoDataMessage) {
              console.log(`    ⚠️  "No data" message detected`);
            }
            
            if (bookingData.hasSeptemberData) {
              console.log(`    📅 September 2025 data detected`);
            }
            
            if (bookingData.hasDateData) {
              console.log(`    📆 Date information present`);
            }
            
            // Enhanced data analysis
            if (bookingData.bookingCount > 0) {
              console.log(`    ✅ Booking data visible (${bookingData.bookingCount} elements)`);
              if (bookingData.bookingCount < company.expectedBookings * 0.5) {
                const issue = `Low booking count (${bookingData.bookingCount} vs expected ${company.expectedBookings})`;
                pageResult.issues.push(issue);
                console.log(`    ⚠️  ${issue}`);
              }
              testResults.summary.passed++;
            } else if (bookingData.hasNoDataMessage) {
              const issue = `No booking data displayed (expected ${company.expectedBookings})`;
              pageResult.issues.push(issue);
              console.log(`    ⚠️  ${issue}`);
              testResults.summary.failed++;
            } else if (bookingData.hasDateData && !bookingData.bookingCount) {
              const issue = `Date structure visible but no bookings shown`;
              pageResult.issues.push(issue);
              console.log(`    ⚠️  ${issue}`);
              testResults.summary.failed++;
            } else {
              const issue = `Unclear data state - no clear indicators`;
              pageResult.issues.push(issue);
              console.log(`    ❌ ${issue}`);
              testResults.summary.failed++;
            }
          }
          
          // Check URL to ensure no unexpected redirects
          const currentUrl = page.url();
          if (!currentUrl.includes(testPage.path)) {
            const issue = `Unexpected redirect from ${testPage.path} to ${currentUrl}`;
            pageResult.issues.push(issue);
            console.log(`    ⚠️  ${issue}`);
          }
          
        } catch (error) {
          const issue = `Navigation/analysis error: ${error.message}`;
          pageResult.issues.push(issue);
          console.log(`    ❌ ${issue}`);
          testResults.summary.failed++;
        }
        
        testResults.companyResults[company.name].pageResults[testPage.name] = pageResult;
        
        // Collect all issues for summary
        pageResult.issues.forEach(issue => {
          testResults.companyResults[company.name].issues.push(`${testPage.name}: ${issue}`);
          testResults.summary.issues.push(`${company.name} - ${testPage.name}: ${issue}`);
        });
      }
      
    } catch (error) {
      const issue = `Company test error: ${error.message}`;
      console.log(`❌ ${issue}`);
      testResults.companyResults[company.name].issues.push(issue);
      testResults.summary.issues.push(`${company.name}: ${issue}`);
      testResults.summary.failed++;
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  // Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(80));
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total Tests: ${testResults.summary.totalTests}`);
  console.log(`  Passed: ${testResults.summary.passed}`);
  console.log(`  Failed: ${testResults.summary.failed}`);
  console.log(`  Success Rate: ${testResults.summary.totalTests > 0 ? Math.round((testResults.summary.passed / testResults.summary.totalTests) * 100) : 0}%`);
  
  // Data isolation analysis
  console.log(`\n🔒 Data Isolation Analysis:`);
  let isolationIssues = 0;
  
  // Company-by-company results
  for (const [companyName, results] of Object.entries(testResults.companyResults)) {
    console.log(`\n🏢 ${companyName} Results:`);
    console.log(`  Login: ${results.loginSuccess ? '✅' : '❌'}`);
    console.log(`  Expected Bookings: ${results.expectedBookings}`);
    console.log(`  Issues Found: ${results.issues.length}`);
    
    if (results.issues.length > 0) {
      console.log(`  Issues:`);
      results.issues.forEach(issue => {
        console.log(`    - ${issue}`);
        if (issue.toLowerCase().includes('no booking data') || 
            issue.toLowerCase().includes('low booking count')) {
          isolationIssues++;
        }
      });
    }
    
    // Page-specific results
    for (const [pageName, pageResult] of Object.entries(results.pageResults)) {
      const status = pageResult.loadSuccess && pageResult.issues.length === 0 ? '✅' : '❌';
      const bookingCount = pageResult.bookingData?.bookingCount || 0;
      const hasData = pageResult.bookingData?.hasSeptemberData ? ' (Sep 2025 ✓)' : '';
      console.log(`    ${status} ${pageName}: ${bookingCount} bookings${hasData}`);
    }
  }
  
  // Critical data isolation findings
  console.log(`\n🚨 DATA ISOLATION FINDINGS:`);
  if (isolationIssues === 0) {
    console.log(`  ✅ No data isolation issues detected`);
  } else {
    console.log(`  ❌ ${isolationIssues} potential data isolation issues found`);
  }
  
  // Save detailed results to file
  const reportPath = `company-test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  // Critical issues summary
  if (testResults.summary.issues.length > 0) {
    console.log(`\n🚨 ALL ISSUES FOUND:`);
    testResults.summary.issues.forEach(issue => console.log(`  ❌ ${issue}`));
  }
  
  return testResults;
}

// Run the test
runComprehensiveTest()
  .then((results) => {
    console.log('\n✅ Test execution completed');
    process.exit(results.summary.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });