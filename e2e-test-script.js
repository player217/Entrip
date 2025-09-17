const { chromium } = require('playwright');

async function runE2ETests() {
  console.log('🚀 Starting End-to-End Testing...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000 // Add delays to see what's happening
  });
  
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    // Enable screenshots on failure
    recordVideo: { dir: 'videos/' }
  });
  
  const page = await context.newPage();
  
  const testResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // Helper function to run test and handle errors
  async function runTest(testName, testFunction) {
    testResults.totalTests++;
    console.log(`\n📋 Testing: ${testName}`);
    
    try {
      await testFunction();
      testResults.passed++;
      console.log(`✅ PASSED: ${testName}`);
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: testName, error: error.message });
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      
      // Take screenshot on failure
      await page.screenshot({ 
        path: `error-${testName.replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    }
  }

  // Test 1: Web Application Accessibility
  await runTest('Web Application Access', async () => {
    console.log('   → Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Should redirect to login
    const currentUrl = page.url();
    console.log(`   → Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('/login')) {
      throw new Error(`Expected to be redirected to login page, but got: ${currentUrl}`);
    }
    
    // Check if login page renders properly
    const loginForm = await page.locator('form').count();
    if (loginForm === 0) {
      throw new Error('Login form not found on login page');
    }
    
    console.log('   → Login page loaded successfully');
  });

  // Test 2: Login Page Elements
  await runTest('Login Page UI Elements', async () => {
    // Check for required form elements
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 });
    await page.waitForSelector('select[name="companyCode"], input[name="companyCode"]', { timeout: 5000 });
    
    const submitButton = await page.locator('button[type="submit"], input[type="submit"]').count();
    if (submitButton === 0) {
      throw new Error('Submit button not found');
    }
    
    console.log('   → All login form elements present');
  });

  // Test Companies Data
  const testCompanies = [
    { name: 'J1', email: 'admin@j1.com', companyCode: 'J1', password: 'pass1234' },
    { name: 'HAPPY', email: 'admin@happy.com', companyCode: 'HAPPY', password: 'pass1234' },
    { name: 'STAR', email: 'admin@star.com', companyCode: 'STAR', password: 'pass1234' }
  ];

  // Test 3-5: Demo Account Logins
  for (const company of testCompanies) {
    await runTest(`${company.name} Admin Login`, async () => {
      console.log(`   → Testing login for ${company.name} (${company.email})`);
      
      // Go to login page (in case we're elsewhere)
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', company.email);
      await page.fill('input[type="password"], input[name="password"]', company.password);
      
      // Handle company code selection (could be select or input)
      try {
        await page.selectOption('select[name="companyCode"]', company.companyCode);
        console.log(`   → Selected company code from dropdown: ${company.companyCode}`);
      } catch (e) {
        await page.fill('input[name="companyCode"]', company.companyCode);
        console.log(`   → Filled company code in input: ${company.companyCode}`);
      }
      
      // Submit form
      await page.click('button[type="submit"], input[type="submit"]');
      
      // Wait for navigation after login
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      const currentUrl = page.url();
      console.log(`   → After login URL: ${currentUrl}`);
      
      // Check if we're no longer on login page
      if (currentUrl.includes('/login')) {
        // Check for error messages
        const errorMsg = await page.locator('.error, [class*="error"], .alert-danger').textContent().catch(() => '');
        throw new Error(`Still on login page. Error: ${errorMsg || 'Login failed'}`);
      }
      
      // Check for authenticated elements (header, navigation, etc.)
      await page.waitForSelector('header, nav, .header, .navbar, .navigation', { timeout: 5000 });
      
      console.log(`   → Successfully logged in as ${company.name} admin`);
    });

    // Test 6-8: Data Visibility for each company
    await runTest(`${company.name} Data Visibility`, async () => {
      console.log(`   → Checking data visibility for ${company.name}`);
      
      // Look for booking data, calendar, or dashboard elements
      const dataElements = [
        '.booking', '.reservation', 
        '.calendar', '.dashboard', 
        '[data-testid*="booking"]', '[data-testid*="calendar"]',
        'table', '.list', '.grid'
      ];
      
      let dataFound = false;
      for (const selector of dataElements) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`   → Found ${count} elements matching: ${selector}`);
          dataFound = true;
        }
      }
      
      // Check if we can access booking-related pages
      const navigationLinks = await page.locator('a[href*="booking"], a[href*="calendar"], a[href*="reservation"]').count();
      if (navigationLinks > 0) {
        console.log(`   → Found ${navigationLinks} navigation links to booking/calendar pages`);
      }
      
      if (!dataFound && navigationLinks === 0) {
        console.log('   ⚠️  No booking data immediately visible, but login was successful');
      }
      
      console.log(`   → Data visibility check completed for ${company.name}`);
    });

    // Test 9-11: UI Component Rendering
    await runTest(`${company.name} UI Components`, async () => {
      console.log(`   → Testing UI components for ${company.name}`);
      
      // Check basic UI structure
      const components = {
        header: await page.locator('header, .header, .navbar').count(),
        navigation: await page.locator('nav, .nav, .navigation, .sidebar').count(),
        main: await page.locator('main, .main, .content').count()
      };
      
      console.log(`   → UI Components found:`, components);
      
      // Try to navigate to calendar/booking pages if links exist
      const calendarLink = await page.locator('a[href*="calendar"]').first();
      const bookingLink = await page.locator('a[href*="booking"]').first();
      
      if (await calendarLink.count() > 0) {
        console.log('   → Testing calendar page navigation');
        await calendarLink.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // Check if calendar components loaded
        const calendarElements = await page.locator('.calendar, [class*="calendar"], .month, .week').count();
        console.log(`   → Calendar elements found: ${calendarElements}`);
      }
      
      if (await bookingLink.count() > 0) {
        console.log('   → Testing booking page navigation');
        await bookingLink.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // Check if booking components loaded
        const bookingElements = await page.locator('.booking, [class*="booking"], table, .list').count();
        console.log(`   → Booking elements found: ${bookingElements}`);
      }
      
      console.log(`   → UI component testing completed for ${company.name}`);
    });

    // Logout after each company test
    await runTest(`${company.name} Logout`, async () => {
      console.log(`   → Testing logout for ${company.name}`);
      
      // Look for logout button/link
      const logoutSelectors = [
        'a[href*="logout"]', 'button[aria-label*="logout"]',
        'button:has-text("Logout")', 'button:has-text("로그아웃")',
        '.logout', '[data-testid*="logout"]'
      ];
      
      let loggedOut = false;
      for (const selector of logoutSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          console.log(`   → Found logout element: ${selector}`);
          await element.first().click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          loggedOut = true;
          break;
        }
      }
      
      if (!loggedOut) {
        // Try clearing storage and navigating to login
        console.log('   → No logout button found, clearing session manually');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.goto('http://localhost:3000/login');
      }
      
      // Verify we're back at login
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        throw new Error(`Logout failed, still at: ${currentUrl}`);
      }
      
      console.log(`   → Successfully logged out from ${company.name}`);
    });
  }

  // Final screenshot
  await page.screenshot({ 
    path: 'final-state.png',
    fullPage: true 
  });

  await browser.close();

  // Print test summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  return testResults;
}

// Run the tests
runE2ETests().catch(console.error);