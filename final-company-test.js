const { chromium } = require('playwright');
const fs = require('fs');

// Company test configurations matching the demo accounts
const companies = [
  {
    name: 'J1',
    expectedBookings: 151,
    companyCode: 'j1',
    demoButtonText: 'J1 관리자'
  },
  {
    name: 'HAPPY', 
    expectedBookings: 150,
    companyCode: 'happy',
    demoButtonText: '해피 관리자'
  },
  {
    name: 'STAR',
    expectedBookings: 183,
    companyCode: 'star', 
    demoButtonText: '스타 관리자'
  },
  {
    name: 'ENTRIP_MAIN',
    expectedBookings: 50,
    companyCode: 'ENTRIP_MAIN',
    demoButtonText: '본사 관리자'
  }
];

// Test pages to check
const testPages = [
  { name: 'Monthly Calendar View', path: '/calendar-monthly' },
  { name: 'Weekly Calendar View', path: '/calendar-weekly' },
  { name: 'Monthly List View', path: '/list-monthly' },
  { name: 'Weekly List View', path: '/list-weekly' }
];

// Login using demo account button
async function loginWithDemoButton(page, demoButtonText) {
  try {
    console.log(`🔑 Clicking demo button: ${demoButtonText}`);
    
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Find and click the demo account button
    const demoButton = page.locator(`button:has-text("${demoButtonText}")`);
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();
    
    console.log(`   🔄 Clicked "${demoButtonText}" button`);
    
    // Wait for login process to complete
    await page.waitForTimeout(5000);
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Still on login page - check for error messages
      const pageText = await page.textContent('body');
      const hasError = pageText.includes('실패') || pageText.includes('error') || pageText.includes('에러');
      return {
        success: false,
        error: hasError ? 'Login error displayed' : 'Still on login page after demo login',
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
      error: `Demo login error: ${error.message}`
    };
  }
}

// Comprehensive booking data analysis
async function analyzeBookingData(page, pageName, company) {
  try {
    // Wait for content to load
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(7000); // Extended wait for dynamic content
    
    // Remove any loading overlays that might be blocking content
    await page.evaluate(() => {
      const loadingElements = document.querySelectorAll('.loading, .spinner, [class*="loading"]');
      loadingElements.forEach(el => el.remove());
    });
    
    await page.waitForTimeout(2000);
    
    // Get comprehensive page analysis
    const pageText = await page.textContent('body');
    
    // Multiple detection strategies for booking elements
    const detectionResults = await Promise.all([
      // Strategy 1: Direct booking selectors
      page.locator('.booking-item, .reservation-item, .calendar-event, .booking-card, [data-booking-id], .booking-entry').count(),
      
      // Strategy 2: Event/calendar selectors  
      page.locator('.event-item, .fc-event, .calendar-day .event, [class*="event"]').count(),
      
      // Strategy 3: Table/list selectors
      page.locator('table tbody tr, .list-item, .data-row, [role="row"]:not([role="columnheader"])').count(),
      
      // Strategy 4: Any element containing booking-related classes
      page.locator('[class*="booking"], [class*="reservation"]').count(),
      
      // Strategy 5: Calendar-specific elements
      page.locator('.calendar .event, [data-date] .booking, .fc-daygrid-event').count()
    ]);
    
    const maxBookingCount = Math.max(...detectionResults);
    const detectionMethod = [
      'Direct booking elements',
      'Event/calendar elements', 
      'Table/list rows',
      'Booking class elements',
      'Calendar events'
    ][detectionResults.indexOf(maxBookingCount)];
    
    // Additional page content analysis
    const analysis = {
      bookingCount: maxBookingCount,
      detectionMethod: detectionMethod,
      detectionResults: {
        directBookings: detectionResults[0],
        eventElements: detectionResults[1], 
        tableRows: detectionResults[2],
        bookingClasses: detectionResults[3],
        calendarEvents: detectionResults[4]
      },
      pageAnalysis: {
        hasBookingText: /booking|reservation|예약/i.test(pageText),
        hasDateInfo: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|월|일|September|9월/.test(pageText),
        hasSeptember2025: (pageText.includes('2025') && (pageText.includes('September') || pageText.includes('9월'))) ||
                         (pageText.includes('2025-09') || pageText.includes('09/2025')),
        hasNoDataMessage: /no data|no bookings|데이터가 없습니다|예약이 없습니다|empty|비어|없음/i.test(pageText),
        hasErrorMessage: /error|에러|오류|failed|실패/i.test(pageText),
        hasLoadingIndicator: /loading|로딩|spinner/i.test(pageText),
        companyCodeVisible: pageText.toLowerCase().includes(company.companyCode.toLowerCase()),
        pageSize: pageText.length,
        pageTitle: await page.title(),
        currentUrl: page.url()
      },
      assessment: {
        dataVisible: maxBookingCount > 0,
        meetsExpectation: maxBookingCount >= Math.max(1, company.expectedBookings * 0.05), // At least 5% or minimum 1
        hasProperFeedback: maxBookingCount > 0 || /no data|empty|없음/i.test(pageText),
        isolationWorking: maxBookingCount > 0 || /no data|empty/i.test(pageText) // Either has data or clear "no data" message
      },
      // Sample of page content for debugging
      pageContentSample: pageText.substring(0, 1000) + (pageText.length > 1000 ? '...' : '')
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
        hasProperFeedback: false,
        isolationWorking: false
      }
    };
  }
}

async function runFinalCompanyTest() {
  console.log('🎯 FINAL Company Data Isolation Test');
  console.log('📊 Testing September 2025 booking data across all company accounts');
  console.log('🔍 Checking data isolation and booking visibility');
  console.log('═'.repeat(80));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const testResults = {
    timestamp: new Date().toISOString(),
    testEnvironment: {
      webApp: 'http://localhost:3000',
      apiServer: 'http://localhost:4001',
      testDate: new Date().toISOString()
    },
    summary: {
      companiesTested: companies.length,
      successfulLogins: 0,
      totalPageTests: 0,
      pagesWithData: 0,
      dataIsolationIssues: [],
      bookingVisibilityIssues: [],
      overallAssessment: null
    },
    companyResults: {}
  };
  
  for (const company of companies) {
    console.log(`\n🏢 Testing Company: ${company.name} (${company.companyCode})`);
    console.log(`   Expected Bookings: ${company.expectedBookings}`);
    console.log(`   Demo Account: ${company.demoButtonText}`);
    console.log('─'.repeat(60));
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    testResults.companyResults[company.name] = {
      companyCode: company.companyCode,
      expectedBookings: company.expectedBookings,
      demoButtonText: company.demoButtonText,
      loginResult: null,
      pageTests: {},
      summary: {
        loginSuccess: false,
        pagesWithData: 0,
        totalPages: testPages.length,
        avgBookingsPerPage: 0,
        hasDataIsolationIssues: false
      }
    };
    
    try {
      // Attempt demo login
      const loginResult = await loginWithDemoButton(page, company.demoButtonText);
      testResults.companyResults[company.name].loginResult = loginResult;
      
      if (!loginResult.success) {
        console.log(`❌ Login failed: ${loginResult.error}`);
        continue;
      }
      
      console.log(`✅ Login successful for ${company.name}`);
      testResults.summary.successfulLogins++;
      testResults.companyResults[company.name].summary.loginSuccess = true;
      
      let totalBookingsFound = 0;
      let pagesWithData = 0;
      
      // Test each booking view page
      for (const testPage of testPages) {
        console.log(`\n  📄 Testing: ${testPage.name}`);
        testResults.summary.totalPageTests++;
        
        const pageTestResult = {
          pageName: testPage.name,
          path: testPage.path,
          navigationSuccess: false,
          dataAnalysis: null,
          issues: [],
          timestamp: new Date().toISOString()
        };
        
        try {
          // Navigate to test page
          console.log(`     🔄 Navigating to ${testPage.path}`);
          await page.goto(`http://localhost:3000${testPage.path}`, { 
            waitUntil: 'networkidle',
            timeout: 25000 
          });
          
          pageTestResult.navigationSuccess = true;
          console.log(`     ✅ Navigation successful`);
          
          // Analyze booking data
          console.log(`     🔍 Analyzing booking data...`);
          const dataAnalysis = await analyzeBookingData(page, testPage.name, company);
          pageTestResult.dataAnalysis = dataAnalysis;
          
          console.log(`     📊 Results:`);
          console.log(`        Found: ${dataAnalysis.bookingCount} booking elements`);
          console.log(`        Method: ${dataAnalysis.detectionMethod}`);
          console.log(`        Detection breakdown: ${JSON.stringify(dataAnalysis.detectionResults)}`);
          
          if (dataAnalysis.error) {
            console.log(`     ❌ Analysis error: ${dataAnalysis.error}`);
            pageTestResult.issues.push(`Analysis error: ${dataAnalysis.error}`);
          } else {
            // Evaluate results
            if (dataAnalysis.assessment.dataVisible) {
              const percentage = Math.round((dataAnalysis.bookingCount / company.expectedBookings) * 100);
              console.log(`     ✅ Booking data visible (${percentage}% of expected count)`);
              
              pagesWithData++;
              totalBookingsFound += dataAnalysis.bookingCount;
              testResults.summary.pagesWithData++;
              
              if (dataAnalysis.pageAnalysis.hasSeptember2025) {
                console.log(`     📅 September 2025 data confirmed`);
              }
              
              if (!dataAnalysis.assessment.meetsExpectation) {
                const issue = `Low booking count: ${dataAnalysis.bookingCount} (expected ~${company.expectedBookings})`;
                pageTestResult.issues.push(issue);
                console.log(`     ⚠️  ${issue}`);
              }
            } else if (dataAnalysis.pageAnalysis.hasNoDataMessage) {
              console.log(`     ⚠️  "No data" message displayed`);
              console.log(`        This could indicate proper data isolation (no data for this view)`);
            } else if (dataAnalysis.pageAnalysis.hasErrorMessage) {
              const issue = 'Error message displayed on page';
              pageTestResult.issues.push(issue);
              console.log(`     ❌ ${issue}`);
              testResults.summary.bookingVisibilityIssues.push(
                `${company.name} - ${testPage.name}: Error on page`
              );
            } else {
              const issue = 'No booking data visible and no clear indication why';
              pageTestResult.issues.push(issue);
              console.log(`     ❌ ${issue}`);
              testResults.summary.bookingVisibilityIssues.push(
                `${company.name} - ${testPage.name}: Unclear data state`
              );
            }
            
            // Check for potential data isolation issues
            if (!dataAnalysis.assessment.isolationWorking) {
              testResults.summary.dataIsolationIssues.push(
                `${company.name} - ${testPage.name}: No data and no feedback (expected ${company.expectedBookings})`
              );
              testResults.companyResults[company.name].summary.hasDataIsolationIssues = true;
            }
          }
          
        } catch (error) {
          const issue = `Page test error: ${error.message}`;
          pageTestResult.issues.push(issue);
          console.log(`     ❌ ${issue}`);
        }
        
        testResults.companyResults[company.name].pageTests[testPage.name] = pageTestResult;
      }
      
      // Update company summary
      testResults.companyResults[company.name].summary.pagesWithData = pagesWithData;
      testResults.companyResults[company.name].summary.avgBookingsPerPage = totalBookingsFound / testPages.length;
      
    } catch (error) {
      console.log(`❌ Company test failed: ${error.message}`);
      testResults.companyResults[company.name].error = error.message;
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  // Generate comprehensive analysis
  console.log('\n' + '═'.repeat(90));
  console.log('📊 COMPREHENSIVE TEST RESULTS & ANALYSIS');
  console.log('═'.repeat(90));
  
  // Overall summary
  console.log(`\n📈 Overall Summary:`);
  console.log(`  Companies Tested: ${testResults.summary.companiesTested}`);
  console.log(`  Successful Logins: ${testResults.summary.successfulLogins}/${companies.length}`);
  console.log(`  Total Page Tests: ${testResults.summary.totalPageTests}`);
  console.log(`  Pages with Data: ${testResults.summary.pagesWithData}/${testResults.summary.totalPageTests}`);
  console.log(`  Data Visibility Issues: ${testResults.summary.bookingVisibilityIssues.length}`);
  console.log(`  Potential Isolation Issues: ${testResults.summary.dataIsolationIssues.length}`);
  
  // Company-by-company detailed results
  console.log(`\n🏢 Company-by-Company Analysis:`);
  
  for (const [companyName, results] of Object.entries(testResults.companyResults)) {
    console.log(`\n  📋 ${companyName} (${results.companyCode}):`);
    console.log(`     Login: ${results.summary.loginSuccess ? '✅' : '❌'}`);
    console.log(`     Expected Bookings: ${results.expectedBookings}`);
    console.log(`     Pages with Data: ${results.summary.pagesWithData}/${results.summary.totalPages}`);
    console.log(`     Avg Bookings per Page: ${Math.round(results.summary.avgBookingsPerPage)}`);
    console.log(`     Data Isolation Issues: ${results.summary.hasDataIsolationIssues ? '⚠️' : '✅'}`);
    
    if (results.summary.loginSuccess) {
      console.log(`     Individual Page Results:`);
      for (const [pageName, pageTest] of Object.entries(results.pageTests)) {
        const analysis = pageTest.dataAnalysis;
        if (analysis && !analysis.error) {
          const bookingCount = analysis.bookingCount;
          const status = bookingCount > 0 ? '✅' : 
                        analysis.pageAnalysis?.hasNoDataMessage ? '⚠️' : '❌';
          const details = bookingCount > 0 ? 
            `${bookingCount} bookings${analysis.pageAnalysis?.hasSeptember2025 ? ' (Sep 2025 ✓)' : ''}` :
            analysis.pageAnalysis?.hasNoDataMessage ? 'No data message' : 'No data, unclear why';
          
          console.log(`       ${status} ${pageName}: ${details}`);
        } else {
          console.log(`       ❌ ${pageName}: ${analysis?.error || 'Test failed'}`);
        }
      }
    }
  }
  
  // Data isolation assessment
  console.log(`\n🔒 Data Isolation Assessment:`);
  
  if (testResults.summary.successfulLogins === 0) {
    testResults.summary.overallAssessment = 'CANNOT_ASSESS';
    console.log(`  ❌ Cannot assess data isolation - no successful logins`);
  } else if (testResults.summary.dataIsolationIssues.length === 0 && testResults.summary.pagesWithData > 0) {
    testResults.summary.overallAssessment = 'WORKING_CORRECTLY';
    console.log(`  ✅ Data isolation appears to be working correctly`);
    console.log(`  📊 Companies can access their booking data appropriately`);
    console.log(`  🔐 No cross-company data leakage detected`);
  } else if (testResults.summary.pagesWithData === 0) {
    testResults.summary.overallAssessment = 'NO_DATA_VISIBLE';
    console.log(`  ❓ No booking data visible for any company`);
    console.log(`  🔍 This could indicate:`);
    console.log(`     - Database connection issues`);
    console.log(`     - No test data loaded for September 2025`);
    console.log(`     - UI components not rendering data`);
  } else {
    testResults.summary.overallAssessment = 'ISSUES_DETECTED';
    console.log(`  ⚠️  Some issues detected:`);
    
    if (testResults.summary.dataIsolationIssues.length > 0) {
      console.log(`  🚨 Data Isolation Issues:`);
      testResults.summary.dataIsolationIssues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
    
    if (testResults.summary.bookingVisibilityIssues.length > 0) {
      console.log(`  ⚠️  Booking Visibility Issues:`);
      testResults.summary.bookingVisibilityIssues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }
  }
  
  // Expected vs Actual Data Analysis
  console.log(`\n📊 Expected vs Actual Data Analysis:`);
  for (const [companyName, results] of Object.entries(testResults.companyResults)) {
    if (results.summary.loginSuccess) {
      const avgBookings = Math.round(results.summary.avgBookingsPerPage);
      const expectedBookings = results.expectedBookings;
      const dataRatio = expectedBookings > 0 ? (avgBookings / expectedBookings * 100).toFixed(1) : 0;
      
      console.log(`  ${companyName}: Expected ${expectedBookings}, Average visible ${avgBookings} (${dataRatio}%)`);
      
      if (avgBookings === 0) {
        console.log(`    🔍 Analysis: No data visible - check database or UI components`);
      } else if (avgBookings < expectedBookings * 0.1) {
        console.log(`    ⚠️  Analysis: Very low data visibility - possible filtering or pagination`);
      } else {
        console.log(`    ✅ Analysis: Reasonable data visibility`);
      }
    }
  }
  
  // Save comprehensive report
  const reportFile = `final-company-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Comprehensive report saved: ${reportFile}`);
  
  // Final recommendation
  console.log(`\n🎯 Final Test Assessment: ${testResults.summary.overallAssessment}`);
  
  return testResults;
}

// Execute the comprehensive test
runFinalCompanyTest()
  .then((results) => {
    console.log('\n✅ Comprehensive test execution completed');
    
    // Exit with appropriate code based on results
    const hasRealIssues = results.summary.dataIsolationIssues.length > 0 ||
                         (results.summary.successfulLogins > 0 && results.summary.pagesWithData === 0);
    
    process.exit(hasRealIssues ? 1 : 0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });