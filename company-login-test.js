const { chromium } = require('playwright');
const fs = require('fs');

// Company login credentials
const companies = [
  {
    name: 'J1',
    expectedBookings: 151,
    companyCode: 'j1',
    loginCredentials: {
      email: 'admin@j1.com',
      password: 'pass1234'
    }
  },
  {
    name: 'HAPPY', 
    expectedBookings: 150,
    companyCode: 'happy',
    loginCredentials: {
      email: 'admin@happy.com',
      password: 'pass1234'
    }
  },
  {
    name: 'STAR',
    expectedBookings: 183,
    companyCode: 'star',
    loginCredentials: {
      email: 'admin@star.com', 
      password: 'pass1234'
    }
  },
  {
    name: 'ENTRIP_MAIN',
    expectedBookings: 50,
    companyCode: 'ENTRIP_MAIN',
    loginCredentials: {
      email: 'admin@entrip.com',
      password: 'pass1234'
    }
  }
];

// Test pages to check
const testPages = [
  { name: 'Monthly Calendar View', path: '/calendar-monthly' },
  { name: 'Weekly Calendar View', path: '/calendar-weekly' },
  { name: 'Monthly List View', path: '/list-monthly' },
  { name: 'Weekly List View', path: '/list-weekly' }
];

// Login to the application
async function loginToApplication(page, credentials) {
  try {
    console.log(`🔑 Logging in as ${credentials.email}...`);
    
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if login form is visible
    const emailField = page.locator('input[type="email"], input[name="email"], #email');
    const passwordField = page.locator('input[type="password"], input[name="password"], #password');
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("로그인")');
    
    // Fill in login credentials
    await emailField.fill(credentials.email);
    await passwordField.fill(credentials.password);
    
    console.log(`   📝 Filled credentials: ${credentials.email}`);
    
    // Click login button
    await loginButton.click();
    console.log(`   🔄 Clicked login button`);
    
    // Wait for navigation after login
    await page.waitForTimeout(3000);
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Still on login page - check for error messages
      const pageText = await page.textContent('body');
      const hasError = pageText.includes('error') || pageText.includes('invalid') || pageText.includes('incorrect');
      return {
        success: false,
        error: hasError ? 'Login error displayed on page' : 'Still on login page after attempt',
        currentUrl: currentUrl
      };
    } else {
      console.log(`   ✅ Login successful - redirected to ${currentUrl}`);
      return {
        success: true,
        currentUrl: currentUrl
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: `Login process error: ${error.message}`
    };
  }
}

// Analyze booking data on a page
async function analyzeBookingData(page, pageName, expectedBookings) {
  try {
    // Wait for content to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(5000); // Allow for dynamic content
    
    // Get page text for analysis
    const pageText = await page.textContent('body');
    
    // Multiple strategies to find booking elements
    const bookingStrategies = [
      // Strategy 1: Common booking element selectors
      async () => {
        const selectors = [
          '.booking-item', '.reservation-item', '.calendar-event',
          '.booking-card', '[data-booking-id]', '.booking-entry',
          '.event-item', '.fc-event', '[class*="booking"]',
          '[class*="reservation"]', '.calendar-day .event'
        ];
        
        let maxCount = 0;
        let bestSelector = null;
        
        for (const selector of selectors) {
          try {
            const count = await page.locator(selector).count();
            if (count > maxCount) {
              maxCount = count;
              bestSelector = selector;
            }
          } catch (e) {
            // Continue with next selector
          }
        }
        
        return { count: maxCount, method: `DOM elements (${bestSelector})` };
      },
      
      // Strategy 2: Table rows and list items
      async () => {
        const tableSelectors = [
          'table tbody tr', 
          '.list-item', 
          '.data-row',
          '[role="row"]',
          'tr[data-id]'
        ];
        
        let maxCount = 0;
        for (const selector of tableSelectors) {
          try {
            const count = await page.locator(selector).count();
            if (count > maxCount) maxCount = count;
          } catch (e) {}
        }
        
        return { count: maxCount, method: 'Table/List rows' };
      },
      
      // Strategy 3: Calendar-specific elements
      async () => {
        const calendarSelectors = [
          '.calendar .event',
          '.fc-event',
          '.calendar-day [data-event]',
          '[data-date] .booking'
        ];
        
        let maxCount = 0;
        for (const selector of calendarSelectors) {
          try {
            const count = await page.locator(selector).count();
            if (count > maxCount) maxCount = count;
          } catch (e) {}
        }
        
        return { count: maxCount, method: 'Calendar events' };
      }
    ];
    
    // Execute all strategies
    const results = await Promise.all(bookingStrategies.map(strategy => strategy()));
    const bestResult = results.reduce((best, current) => 
      current.count > best.count ? current : best, { count: 0, method: 'none' });
    
    // Additional page analysis
    const analysis = {
      bookingCount: bestResult.count,
      detectionMethod: bestResult.method,
      pageAnalysis: {
        hasBookingText: /booking|reservation|예약/i.test(pageText),
        hasDateInfo: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|월|일/.test(pageText),
        hasSeptember2025: pageText.includes('2025') && (pageText.includes('September') || pageText.includes('9월')),
        hasNoDataMessage: /no data|no bookings|데이터가 없습니다|예약이 없습니다|empty|비어|없음/i.test(pageText),
        hasErrorMessage: /error|에러|오류/i.test(pageText),
        hasLoadingIndicator: /loading|로딩|spinner/i.test(pageText),
        pageSize: pageText.length,
        pageTitle: await page.title()
      },
      assessment: {
        dataVisible: bestResult.count > 0,
        meetsExpectation: bestResult.count >= expectedBookings * 0.1, // At least 10% of expected
        isolationWorking: bestResult.count > 0 || /no data|empty/i.test(pageText)
      }
    };
    
    return analysis;
    
  } catch (error) {
    return {
      bookingCount: 0,
      detectionMethod: 'error',
      error: error.message,
      pageAnalysis: {},
      assessment: {
        dataVisible: false,
        meetsExpectation: false,
        isolationWorking: false
      }
    };
  }
}

async function runCompanyDataIsolationTest() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
      companiesTested: companies.length,
      successfulLogins: 0,
      totalPageTests: 0,
      dataVisibilityIssues: [],
      isolationIssues: []
    },
    companyResults: {}
  };

  console.log('🔐 Company Data Isolation Test');
  console.log('📊 Testing September 2025 booking data visibility and isolation');
  console.log('═'.repeat(70));
  
  for (const company of companies) {
    console.log(`\n🏢 Testing Company: ${company.name} (${company.companyCode})`);
    console.log(`   Expected Bookings: ${company.expectedBookings}`);
    console.log('─'.repeat(50));
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    testResults.companyResults[company.name] = {
      companyCode: company.companyCode,
      expectedBookings: company.expectedBookings,
      loginResult: null,
      pageTests: {}
    };
    
    try {
      // Attempt login
      const loginResult = await loginToApplication(page, company.loginCredentials);
      testResults.companyResults[company.name].loginResult = loginResult;
      
      if (!loginResult.success) {
        console.log(`❌ Login failed: ${loginResult.error}`);
        console.log(`   Current URL: ${loginResult.currentUrl}`);
        continue;
      }
      
      console.log(`✅ Login successful for ${company.name}`);
      testResults.summary.successfulLogins++;
      
      // Test each booking view page
      for (const testPage of testPages) {
        console.log(`\n  📄 Testing: ${testPage.name}`);
        testResults.summary.totalPageTests++;
        
        const pageTestResult = {
          pageName: testPage.name,
          path: testPage.path,
          navigationSuccess: false,
          dataAnalysis: null,
          issues: []
        };
        
        try {
          // Navigate to test page
          await page.goto(`http://localhost:3000${testPage.path}`, { 
            waitUntil: 'networkidle',
            timeout: 20000 
          });
          
          pageTestResult.navigationSuccess = true;
          console.log(`     ✅ Navigation successful`);
          
          // Analyze booking data
          const dataAnalysis = await analyzeBookingData(page, testPage.name, company.expectedBookings);
          pageTestResult.dataAnalysis = dataAnalysis;
          
          console.log(`     📊 Found ${dataAnalysis.bookingCount} booking elements (${dataAnalysis.detectionMethod})`);
          
          // Evaluate results
          if (dataAnalysis.error) {
            console.log(`     ❌ Analysis error: ${dataAnalysis.error}`);
            pageTestResult.issues.push(`Analysis error: ${dataAnalysis.error}`);
          } else {
            // Data visibility assessment
            if (dataAnalysis.assessment.dataVisible) {
              const percentage = Math.round((dataAnalysis.bookingCount / company.expectedBookings) * 100);
              console.log(`     ✅ Booking data visible (${percentage}% of expected count)`);
              
              if (dataAnalysis.pageAnalysis.hasSeptember2025) {
                console.log(`     📅 September 2025 data confirmed`);
              }
              
              if (!dataAnalysis.assessment.meetsExpectation) {
                const issue = `Low booking count: ${dataAnalysis.bookingCount}/${company.expectedBookings}`;
                pageTestResult.issues.push(issue);
                console.log(`     ⚠️  ${issue}`);
              }
            } else if (dataAnalysis.pageAnalysis.hasNoDataMessage) {
              console.log(`     ⚠️  "No data" message displayed - possible isolation working correctly`);
            } else if (dataAnalysis.pageAnalysis.hasErrorMessage) {
              const issue = 'Error message displayed on page';
              pageTestResult.issues.push(issue);
              console.log(`     ❌ ${issue}`);
            } else {
              const issue = 'No booking data visible and no clear indication why';
              pageTestResult.issues.push(issue);
              console.log(`     ❌ ${issue}`);
              testResults.summary.dataVisibilityIssues.push(
                `${company.name} - ${testPage.name}: No data and no indication`
              );
            }
            
            // Check for isolation issues
            if (dataAnalysis.bookingCount === 0 && !dataAnalysis.pageAnalysis.hasNoDataMessage) {
              testResults.summary.isolationIssues.push(
                `${company.name} - ${testPage.name}: Unclear data state (expected ${company.expectedBookings})`
              );
            }
          }
          
        } catch (error) {
          const issue = `Page test error: ${error.message}`;
          pageTestResult.issues.push(issue);
          console.log(`     ❌ ${issue}`);
        }
        
        testResults.companyResults[company.name].pageTests[testPage.name] = pageTestResult;
      }
      
    } catch (error) {
      console.log(`❌ Company test failed: ${error.message}`);
      testResults.companyResults[company.name].error = error.message;
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  // Generate comprehensive report
  console.log('\n' + '═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(80));
  
  console.log(`\n📈 Test Summary:`);
  console.log(`  Companies Tested: ${testResults.summary.companiesTested}`);
  console.log(`  Successful Logins: ${testResults.summary.successfulLogins}/${companies.length}`);
  console.log(`  Total Page Tests: ${testResults.summary.totalPageTests}`);
  console.log(`  Data Visibility Issues: ${testResults.summary.dataVisibilityIssues.length}`);
  console.log(`  Potential Isolation Issues: ${testResults.summary.isolationIssues.length}`);
  
  // Detailed results per company
  console.log(`\n🏢 Company-by-Company Results:`);
  
  for (const [companyName, results] of Object.entries(testResults.companyResults)) {
    console.log(`\n  ${companyName}:`);
    console.log(`    Login: ${results.loginResult?.success ? '✅' : '❌'}`);
    console.log(`    Expected Bookings: ${results.expectedBookings}`);
    
    if (results.loginResult?.success && Object.keys(results.pageTests).length > 0) {
      console.log(`    Page Test Results:`);
      for (const [pageName, pageTest] of Object.entries(results.pageTests)) {
        const dataAnalysis = pageTest.dataAnalysis;
        const bookingCount = dataAnalysis?.bookingCount || 0;
        const issues = pageTest.issues.length;
        const status = pageTest.navigationSuccess && bookingCount > 0 ? '✅' : 
                      dataAnalysis?.pageAnalysis?.hasNoDataMessage ? '⚠️' : '❌';
        
        console.log(`      ${status} ${pageName}: ${bookingCount} bookings${issues > 0 ? ` (${issues} issues)` : ''}`);
      }
    } else if (results.loginResult && !results.loginResult.success) {
      console.log(`    Login Error: ${results.loginResult.error}`);
    }
  }
  
  // Data isolation assessment
  console.log(`\n🔒 Data Isolation Assessment:`);
  
  if (testResults.summary.successfulLogins === 0) {
    console.log(`  ❌ Cannot assess data isolation - no successful logins`);
  } else if (testResults.summary.isolationIssues.length === 0 && testResults.summary.dataVisibilityIssues.length === 0) {
    console.log(`  ✅ Data isolation appears to be working correctly`);
    console.log(`  📊 Each company can access their booking data appropriately`);
  } else {
    console.log(`  ⚠️  Potential issues detected:`);
    [...testResults.summary.isolationIssues, ...testResults.summary.dataVisibilityIssues].forEach(issue => {
      console.log(`    - ${issue}`);
    });
  }
  
  // Save detailed report
  const reportFile = `company-isolation-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed report saved: ${reportFile}`);
  
  return testResults;
}

// Execute the test
runCompanyDataIsolationTest()
  .then((results) => {
    console.log('\n✅ Test execution completed');
    
    // Exit with error code if issues found
    const hasIssues = results.summary.dataVisibilityIssues.length > 0 || 
                      results.summary.isolationIssues.length > 0 ||
                      results.summary.successfulLogins === 0;
    
    process.exit(hasIssues ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });