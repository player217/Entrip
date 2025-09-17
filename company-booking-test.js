const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Company test configurations with auth tokens
const companies = [
  {
    name: 'J1',
    expectedBookings: 151,
    companyCode: 'j1',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTVnems4dzkwMDA0dzNhOGtoeDZ6a3F1IiwiY29tcGFueUNvZGUiOiJqMSIsInVzZXJuYW1lIjoiYWRtaW5AajEuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU3NTc2MjkzLCJleHAiOjE3NTc2NjI2OTN9.oVgz_SjOQne_kkFRCRvs7dJ-NsgUkNjSnCc18KZvO50'
  },
  {
    name: 'HAPPY', 
    expectedBookings: 150,
    companyCode: 'happy',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTVnems4dzkwMDA4dzNhOGtoeDZ6a3F5IiwiY29tcGFueUNvZGUiOiJoYXBweSIsInVzZXJuYW1lIjoiYWRtaW5AaGFwcHkuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU3NTc2NDA2LCJleHAiOjE3NTc2NjI4MDZ9.lBEbnn8nv9nE7ey3FJD1W2LX6R-aHjEPxRMSgXaopLk'
  },
  {
    name: 'STAR',
    expectedBookings: 183,
    companyCode: 'star',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTVnems4dzkwMDExdzNhOGtoeDZ6a3IxIiwiY29tcGFueUNvZGUiOiJzdGFyIiwidXNlcm5hbWUiOiJhZG1pbkBzdGFyLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc1NzU3NjQzMiwiZXhwIjoxNzU3NjYyODMyfQ.eK9I730rG-n05w73aSyB8WBFNmVAKvHrUt1XPCW8NCM'
  },
  {
    name: 'ENTRIP_MAIN',
    expectedBookings: 50,
    companyCode: 'ENTRIP_MAIN',
    authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTVnems4dzkwMDAxdzNhOGtoeDZ6a3FyIiwiY29tcGFueUNvZGUiOiJFTlRSSVBfTUFJTiIsInVzZXJuYW1lIjoiYWRtaW5AZW50cmlwLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTc1NzU3NjI2NywiZXhwIjoxNzU3NjYyNjY3fQ.EYcH6iDJM0gta9zALNt5kVE7bLtMddc3Gxxt8lXG5jQ'
  }
];

// Test pages to check
const testPages = [
  {
    name: 'Monthly Calendar View',
    path: '/calendar-monthly'
  },
  {
    name: 'Weekly Calendar View', 
    path: '/calendar-weekly'
  },
  {
    name: 'Monthly List View',
    path: '/list-monthly'
  },
  {
    name: 'Weekly List View',
    path: '/list-weekly'
  }
];

// Decode JWT to extract info
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    return null;
  }
}

// Set authentication in browser
async function setAuthentication(page, authToken) {
  // Set localStorage items for authentication
  await page.addInitScript((token) => {
    localStorage.setItem('auth-token', token);
    localStorage.setItem('accessToken', token);
    
    // Also set auth store data
    const payload = JSON.parse(atob(token.split('.')[1]));
    const authStore = {
      state: {
        user: {
          id: payload.userId,
          username: payload.username,
          role: payload.role,
          companyCode: payload.companyCode
        },
        isAuthenticated: true,
        accessToken: token
      },
      version: 0
    };
    localStorage.setItem('auth-store', JSON.stringify(authStore));
  }, authToken);
}

// Wait for content to load and analyze booking data
async function analyzeBookingData(page, testPage, company) {
  try {
    // Wait for page to be ready
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check for loading indicators and wait for them to finish
    try {
      await page.waitForSelector('.loading, .spinner', { state: 'detached', timeout: 10000 });
    } catch (e) {
      // No loading indicator found, continue
    }
    
    // Get page content for analysis
    const pageText = await page.textContent('body');
    
    // Multiple strategies to detect booking data
    const bookingDetectionStrategies = [
      // Strategy 1: Count specific booking elements
      async () => {
        const selectors = [
          '.booking-item', '.reservation-item', '.calendar-event', 
          '.booking-card', '[data-booking-id]', '.booking-entry',
          '.event-item', '.fc-event', '[class*="booking"]'
        ];
        
        let maxCount = 0;
        let usedSelector = null;
        
        for (const selector of selectors) {
          try {
            const count = await page.locator(selector).count();
            if (count > maxCount) {
              maxCount = count;
              usedSelector = selector;
            }
          } catch (e) {
            // Continue with next selector
          }
        }
        
        return { count: maxCount, method: `DOM elements (${usedSelector})` };
      },
      
      // Strategy 2: Look for data tables or lists
      async () => {
        const tableRows = await page.locator('table tbody tr, .list-item, .data-row').count();
        return { count: tableRows, method: 'Table/List rows' };
      },
      
      // Strategy 3: Check for calendar events
      async () => {
        const calendarEvents = await page.locator('[class*="calendar"] [class*="event"], .calendar-day [data-event]').count();
        return { count: calendarEvents, method: 'Calendar events' };
      },
      
      // Strategy 4: API response analysis
      async () => {
        // Listen for API responses
        let apiBookingCount = 0;
        
        page.on('response', response => {
          if (response.url().includes('/api/bookings') && response.status() === 200) {
            response.json().then(data => {
              if (Array.isArray(data)) {
                apiBookingCount = data.length;
              } else if (data && data.bookings && Array.isArray(data.bookings)) {
                apiBookingCount = data.bookings.length;
              }
            }).catch(() => {});
          }
        });
        
        return { count: apiBookingCount, method: 'API response' };
      }
    ];
    
    // Execute all strategies and pick the highest count
    const results = await Promise.all(bookingDetectionStrategies.map(strategy => strategy()));
    const bestResult = results.reduce((best, current) => 
      current.count > best.count ? current : best, { count: 0, method: 'none' });
    
    // Additional analysis
    const analysis = {
      bookingCount: bestResult.count,
      detectionMethod: bestResult.method,
      hasNoDataMessage: /no data|no bookings|데이터가 없습니다|예약이 없습니다/i.test(pageText),
      hasBookingRelatedText: /booking|reservation|예약/i.test(pageText),
      hasSeptember2025: pageText.includes('2025') && (pageText.includes('September') || pageText.includes('9월')),
      hasDateInformation: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|월|일/.test(pageText),
      pageLoadedCorrectly: !pageText.includes('Error') && !pageText.includes('404'),
      companyCodeVisible: pageText.toLowerCase().includes(company.companyCode.toLowerCase()),
      currentUrl: page.url(),
      pageTextSample: pageText.substring(0, 500)
    };
    
    return analysis;
    
  } catch (error) {
    return {
      bookingCount: 0,
      detectionMethod: 'error',
      error: error.message,
      hasNoDataMessage: false,
      hasBookingRelatedText: false,
      hasSeptember2025: false,
      hasDateInformation: false,
      pageLoadedCorrectly: false,
      companyCodeVisible: false,
      currentUrl: page.url(),
      pageTextSample: ''
    };
  }
}

async function runCompanyBookingTest() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCompanies: companies.length,
      totalTests: 0,
      successfulLogins: 0,
      dataIsolationIssues: [],
      bookingVisibilityIssues: []
    },
    companyResults: {}
  };

  console.log('🚀 Starting Company Booking Data Isolation Test');
  console.log('📊 Testing data visibility for September 2025 bookings\n');
  
  for (const company of companies) {
    console.log(`\n🏢 Testing Company: ${company.name}`);
    console.log(`   Expected Bookings: ${company.expectedBookings}`);
    console.log(`   Company Code: ${company.companyCode}`);
    console.log('─'.repeat(50));
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    testResults.companyResults[company.name] = {
      companyCode: company.companyCode,
      expectedBookings: company.expectedBookings,
      loginAttempted: false,
      loginSuccess: false,
      authTokenValid: false,
      pageTests: {}
    };
    
    try {
      // Validate auth token
      const tokenPayload = decodeJWT(company.authToken);
      if (!tokenPayload) {
        console.log('❌ Invalid auth token format');
        continue;
      }
      
      console.log(`✅ Token valid for user: ${tokenPayload.username}`);
      testResults.companyResults[company.name].authTokenValid = true;
      
      // Set authentication
      await setAuthentication(page, company.authToken);
      
      // Navigate to main application
      console.log('🔄 Navigating to main application...');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      testResults.companyResults[company.name].loginAttempted = true;
      
      // Check if authentication worked
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('❌ Redirected to login - authentication failed');
        continue;
      }
      
      console.log('✅ Authentication successful');
      testResults.companyResults[company.name].loginSuccess = true;
      testResults.summary.successfulLogins++;
      
      // Test each booking view page
      for (const testPage of testPages) {
        console.log(`\n  📄 Testing: ${testPage.name}`);
        testResults.summary.totalTests++;
        
        const testResult = {
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
          
          console.log(`     ✅ Navigation successful`);
          testResult.navigationSuccess = true;
          
          // Analyze booking data
          const dataAnalysis = await analyzeBookingData(page, testPage, company);
          testResult.dataAnalysis = dataAnalysis;
          
          console.log(`     📊 Detected: ${dataAnalysis.bookingCount} bookings (${dataAnalysis.detectionMethod})`);
          
          if (dataAnalysis.error) {
            console.log(`     ❌ Analysis error: ${dataAnalysis.error}`);
            testResult.issues.push(`Analysis error: ${dataAnalysis.error}`);
          }
          
          // Evaluate results
          if (dataAnalysis.bookingCount === 0) {
            if (dataAnalysis.hasNoDataMessage) {
              console.log(`     ⚠️ No data message shown - possible data isolation issue`);
              testResult.issues.push('No booking data shown with "no data" message');
              testResults.summary.dataIsolationIssues.push(
                `${company.name} - ${testPage.name}: No data shown (expected ${company.expectedBookings})`
              );
            } else {
              console.log(`     ❌ No bookings found and no clear reason`);
              testResult.issues.push('No bookings found without clear indication');
              testResults.summary.bookingVisibilityIssues.push(
                `${company.name} - ${testPage.name}: Unclear booking state`
              );
            }
          } else {
            const percentage = Math.round((dataAnalysis.bookingCount / company.expectedBookings) * 100);
            console.log(`     ✅ Bookings visible (${percentage}% of expected)`);
            
            if (dataAnalysis.bookingCount < company.expectedBookings * 0.3) {
              console.log(`     ⚠️ Low booking count detected`);
              testResult.issues.push(`Low booking count: ${dataAnalysis.bookingCount}/${company.expectedBookings}`);
            }
            
            if (dataAnalysis.hasSeptember2025) {
              console.log(`     📅 September 2025 data confirmed`);
            }
          }
          
          if (!dataAnalysis.pageLoadedCorrectly) {
            console.log(`     ❌ Page load issues detected`);
            testResult.issues.push('Page load errors');
          }
          
        } catch (error) {
          console.log(`     ❌ Test failed: ${error.message}`);
          testResult.issues.push(`Test error: ${error.message}`);
        }
        
        testResults.companyResults[company.name].pageTests[testPage.name] = testResult;
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
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total Companies Tested: ${testResults.summary.totalCompanies}`);
  console.log(`  Successful Logins: ${testResults.summary.successfulLogins}`);
  console.log(`  Total Page Tests: ${testResults.summary.totalTests}`);
  console.log(`  Data Isolation Issues: ${testResults.summary.dataIsolationIssues.length}`);
  console.log(`  Booking Visibility Issues: ${testResults.summary.bookingVisibilityIssues.length}`);
  
  // Detailed company results
  console.log(`\n🏢 Company-by-Company Results:`);
  for (const [companyName, results] of Object.entries(testResults.companyResults)) {
    console.log(`\n  ${companyName}:`);
    console.log(`    Login: ${results.loginSuccess ? '✅' : '❌'}`);
    console.log(`    Expected Bookings: ${results.expectedBookings}`);
    
    if (results.pageTests && Object.keys(results.pageTests).length > 0) {
      console.log(`    Page Test Results:`);
      for (const [pageName, pageResult] of Object.entries(results.pageTests)) {
        const bookingCount = pageResult.dataAnalysis?.bookingCount || 0;
        const issues = pageResult.issues.length;
        const status = issues === 0 && bookingCount > 0 ? '✅' : '⚠️';
        console.log(`      ${status} ${pageName}: ${bookingCount} bookings (${issues} issues)`);
      }
    }
  }
  
  // Data isolation analysis
  if (testResults.summary.dataIsolationIssues.length > 0) {
    console.log(`\n🚨 DATA ISOLATION ISSUES:`);
    testResults.summary.dataIsolationIssues.forEach(issue => {
      console.log(`  ❌ ${issue}`);
    });
  } else {
    console.log(`\n✅ No data isolation issues detected`);
  }
  
  // Booking visibility issues
  if (testResults.summary.bookingVisibilityIssues.length > 0) {
    console.log(`\n⚠️ BOOKING VISIBILITY ISSUES:`);
    testResults.summary.bookingVisibilityIssues.forEach(issue => {
      console.log(`  ⚠️ ${issue}`);
    });
  }
  
  // Save detailed report
  const reportFile = `company-booking-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed report saved: ${reportFile}`);
  
  return testResults;
}

// Execute the test
runCompanyBookingTest()
  .then(() => {
    console.log('\n✅ Test execution completed');
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });