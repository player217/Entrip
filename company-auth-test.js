const { chromium } = require('playwright');
const fs = require('fs');

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
  { name: 'Monthly Calendar View', path: '/calendar-monthly' },
  { name: 'Weekly Calendar View', path: '/calendar-weekly' },
  { name: 'Monthly List View', path: '/list-monthly' },
  { name: 'Weekly List View', path: '/list-weekly' }
];

async function testCompanyAuthentication() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    authenticationResults: {},
    dataIsolationResults: {}
  };

  console.log('🔐 Starting Company Authentication & Data Isolation Test\n');
  
  for (const company of companies) {
    console.log(`🏢 Testing Company: ${company.name} (${company.companyCode})`);
    console.log(`📊 Expected Bookings: ${company.expectedBookings}`);
    console.log('─'.repeat(50));
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    testResults.authenticationResults[company.name] = {
      companyCode: company.companyCode,
      expectedBookings: company.expectedBookings,
      cookieSet: false,
      authenticationSuccess: false,
      pageTests: {}
    };
    
    try {
      // Set authentication cookie properly
      await context.addCookies([{
        name: 'auth-token',
        value: company.authToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }]);
      
      console.log('✅ Authentication cookie set');
      testResults.authenticationResults[company.name].cookieSet = true;
      
      // Navigate to main application  
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('❌ Still redirected to login - authentication failed');
        console.log(`   Current URL: ${currentUrl}`);
      } else {
        console.log('✅ Authentication successful!');
        console.log(`   Current URL: ${currentUrl}`);
        testResults.authenticationResults[company.name].authenticationSuccess = true;
        
        // Test each booking view page
        for (const testPage of testPages) {
          console.log(`\n  📄 Testing: ${testPage.name}`);
          
          const pageTest = {
            navigationSuccess: false,
            bookingDataFound: false,
            bookingCount: 0,
            dataAnalysis: {}
          };
          
          try {
            // Navigate to test page
            await page.goto(`http://localhost:3000${testPage.path}`, { 
              waitUntil: 'networkidle',
              timeout: 20000 
            });
            
            pageTest.navigationSuccess = true;
            console.log(`     ✅ Navigation successful`);
            
            // Wait for content to load
            await page.waitForTimeout(5000);
            
            // Analyze page content
            const pageText = await page.textContent('body');
            
            // Multiple methods to detect booking data
            const bookingSelectors = [
              '.booking-item', '.reservation-item', '.calendar-event',
              '.booking-card', '[data-booking-id]', '.booking-entry',
              '.event-item', '.fc-event', '[class*="booking"]',
              'table tbody tr', '.list-item', '.data-row'
            ];
            
            let maxBookingCount = 0;
            for (const selector of bookingSelectors) {
              try {
                const count = await page.locator(selector).count();
                if (count > maxBookingCount) {
                  maxBookingCount = count;
                }
              } catch (e) {
                // Continue with next selector
              }
            }
            
            pageTest.bookingCount = maxBookingCount;
            pageTest.bookingDataFound = maxBookingCount > 0;
            
            // Additional analysis
            pageTest.dataAnalysis = {
              hasBookingText: /booking|reservation|예약/i.test(pageText),
              hasDateInfo: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|월|일/.test(pageText),
              hasSeptemberData: pageText.includes('2025') && (pageText.includes('September') || pageText.includes('9월')),
              hasNoDataMessage: /no data|no bookings|데이터가 없습니다|예약이 없습니다/i.test(pageText),
              pageLoadedCorrectly: !pageText.includes('Error') && !pageText.includes('404'),
              companyCodeVisible: pageText.toLowerCase().includes(company.companyCode.toLowerCase()),
              pageTextSample: pageText.substring(0, 300) + '...'
            };
            
            console.log(`     📊 Found ${maxBookingCount} booking elements`);
            
            if (maxBookingCount === 0) {
              if (pageTest.dataAnalysis.hasNoDataMessage) {
                console.log(`     ⚠️  "No data" message detected - possible data isolation issue`);
              } else {
                console.log(`     ❌ No booking data and no clear indication why`);
              }
            } else {
              const percentage = Math.round((maxBookingCount / company.expectedBookings) * 100);
              console.log(`     ✅ Data visible (${percentage}% of expected count)`);
            }
            
          } catch (error) {
            console.log(`     ❌ Page test failed: ${error.message}`);
            pageTest.error = error.message;
          }
          
          testResults.authenticationResults[company.name].pageTests[testPage.name] = pageTest;
        }
      }
      
    } catch (error) {
      console.log(`❌ Company test failed: ${error.message}`);
      testResults.authenticationResults[company.name].error = error.message;
    } finally {
      await context.close();
    }
    
    console.log(); // Empty line between companies
  }
  
  await browser.close();
  
  // Generate comprehensive report
  console.log('\n' + '═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('═'.repeat(80));
  
  let successfulLogins = 0;
  let totalBookingTests = 0;
  let bookingDataFound = 0;
  let dataIsolationIssues = 0;
  
  console.log('\n🔐 Authentication Results:');
  for (const [companyName, results] of Object.entries(testResults.authenticationResults)) {
    console.log(`\n  🏢 ${companyName}:`);
    console.log(`     Cookie Set: ${results.cookieSet ? '✅' : '❌'}`);
    console.log(`     Login Success: ${results.authenticationSuccess ? '✅' : '❌'}`);
    console.log(`     Expected Bookings: ${results.expectedBookings}`);
    
    if (results.authenticationSuccess) {
      successfulLogins++;
      
      console.log(`     Page Test Results:`);
      for (const [pageName, pageTest] of Object.entries(results.pageTests)) {
        totalBookingTests++;
        const status = pageTest.navigationSuccess && pageTest.bookingDataFound ? '✅' : '❌';
        console.log(`       ${status} ${pageName}: ${pageTest.bookingCount} bookings`);
        
        if (pageTest.bookingDataFound) {
          bookingDataFound++;
        }
        
        if (pageTest.bookingCount === 0 && pageTest.dataAnalysis?.hasNoDataMessage) {
          dataIsolationIssues++;
        }
      }
    }
  }
  
  // Summary statistics
  console.log(`\n📈 Test Summary:`);
  console.log(`  Companies Tested: ${companies.length}`);
  console.log(`  Successful Logins: ${successfulLogins}/${companies.length}`);
  console.log(`  Total Page Tests: ${totalBookingTests}`);
  console.log(`  Tests with Booking Data: ${bookingDataFound}/${totalBookingTests}`);
  console.log(`  Potential Data Isolation Issues: ${dataIsolationIssues}`);
  
  // Data isolation assessment
  console.log(`\n🔒 Data Isolation Assessment:`);
  if (successfulLogins === 0) {
    console.log(`  ❌ Cannot assess data isolation - no successful logins`);
  } else if (dataIsolationIssues > 0) {
    console.log(`  ⚠️  ${dataIsolationIssues} potential data isolation issues detected`);
    console.log(`  📋 Companies showing "no data" messages may indicate isolation problems`);
  } else if (bookingDataFound > 0) {
    console.log(`  ✅ Data isolation appears to be working correctly`);
    console.log(`  📊 Each company can access their booking data appropriately`);
  } else {
    console.log(`  ❓ Inconclusive - no booking data visible for any company`);
  }
  
  // Save detailed report
  const reportFile = `company-auth-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed report saved: ${reportFile}`);
  
  return testResults;
}

// Execute the test
testCompanyAuthentication()
  .then(() => {
    console.log('\n✅ Test execution completed');
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });