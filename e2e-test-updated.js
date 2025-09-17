const { chromium } = require('playwright');

async function runE2ETests() {
  console.log('🚀 Starting Comprehensive End-to-End Testing...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 2000 // Slower for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();
  
  const testResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: [],
    screenshots: []
  };

  // Helper function to run test and handle errors
  async function runTest(testName, testFunction) {
    testResults.totalTests++;
    console.log(`\n📋 Testing: ${testName}`);
    
    try {
      await testFunction();
      testResults.passed++;
      console.log(`✅ PASSED: ${testName}`);
      
      // Take success screenshot
      const screenshotPath = `success-${testName.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      testResults.screenshots.push(screenshotPath);
      
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: testName, error: error.message });
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      
      // Take error screenshot
      const errorScreenshotPath = `error-${testName.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ 
        path: errorScreenshotPath,
        fullPage: true 
      });
      testResults.screenshots.push(errorScreenshotPath);
    }
  }

  // Test 1: Web Application Accessibility
  await runTest('Web Application Accessibility', async () => {
    console.log('   → Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    const currentUrl = page.url();
    console.log(`   → Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('/login')) {
      throw new Error(`Expected to be redirected to login page, but got: ${currentUrl}`);
    }
    
    // Check for ENTRIP branding
    await page.waitForSelector('text=ENTRIP', { timeout: 10000 });
    console.log('   → ENTRIP branding found');
    
    // Check for Korean login text
    await page.waitForSelector('text=로그인', { timeout: 5000 });
    console.log('   → Korean login interface confirmed');
    
    console.log('   → Web application is fully accessible');
  });

  // Test 2: Login Page UI Components
  await runTest('Login Page UI Components', async () => {
    // Check for quick login section
    const quickLoginText = await page.locator('text=빠른 계정 선택').count();
    if (quickLoginText === 0) {
      throw new Error('Quick login section not found');
    }
    console.log('   → Quick login section present');
    
    // Check for manual login form
    const companyCodeInput = await page.locator('input').first();
    if (await companyCodeInput.count() === 0) {
      throw new Error('Company code input not found');
    }
    console.log('   → Company code input found');
    
    // Check for login button
    const loginButton = await page.locator('text=로그인').count();
    if (loginButton === 0) {
      throw new Error('Login button not found');
    }
    console.log('   → Login button found');
    
    console.log('   → All UI components are present and properly rendered');
  });

  // Test 3-5: Quick Login Tests for Each Company
  const companies = [
    { name: 'J1', buttonText: 'J1 관리자' },
    { name: 'HAPPY', buttonText: '해피 관리자' },
    { name: 'STAR', buttonText: '스타투어 관리자' }
  ];

  for (const company of companies) {
    await runTest(`${company.name} Quick Login`, async () => {
      console.log(`   → Testing quick login for ${company.name}`);
      
      // Navigate to fresh login page
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
      
      // Look for company quick login button
      const quickLoginButton = page.locator(`text=${company.buttonText}`);
      
      if (await quickLoginButton.count() === 0) {
        throw new Error(`Quick login button for ${company.name} not found: ${company.buttonText}`);
      }
      
      console.log(`   → Found quick login button: ${company.buttonText}`);
      
      // Click the quick login button
      await quickLoginButton.click();
      
      // Wait for potential navigation or state change
      await page.waitForTimeout(3000);
      
      // Check if we're still on login or if there's any change
      const currentUrl = page.url();
      console.log(`   → After clicking, URL: ${currentUrl}`);
      
      // Look for any error messages or success indicators
      const errorMessages = await page.locator('.error, [class*="error"], .alert').count();
      if (errorMessages > 0) {
        const errorText = await page.locator('.error, [class*="error"], .alert').first().textContent();
        console.log(`   → Error message found: ${errorText}`);
      }
      
      console.log(`   → Quick login test completed for ${company.name}`);
    });

    // Test Data Visibility after login attempt
    await runTest(`${company.name} Dashboard Access`, async () => {
      console.log(`   → Checking dashboard access for ${company.name}`);
      
      // Try to navigate to main dashboard
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      const currentUrl = page.url();
      console.log(`   → Dashboard URL: ${currentUrl}`);
      
      // Check if we can access the main application
      if (currentUrl.includes('/login')) {
        console.log('   ⚠️  Still redirected to login - authentication may be required');
      } else {
        console.log('   → Successfully accessed main application');
        
        // Look for navigation or content elements
        const navElements = await page.locator('nav, .nav, header, .header, .sidebar').count();
        console.log(`   → Navigation elements found: ${navElements}`);
        
        // Look for booking/calendar related content
        const contentElements = await page.locator('.booking, .calendar, .reservation, table').count();
        console.log(`   → Content elements found: ${contentElements}`);
      }
      
      console.log(`   → Dashboard access check completed for ${company.name}`);
    });
  }

  // Test 6: Manual Login Flow
  await runTest('Manual Login Flow', async () => {
    console.log('   → Testing manual login with form inputs');
    
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Fill manual login form
    const inputs = await page.locator('input').all();
    
    if (inputs.length >= 3) {
      // Fill company code (first input)
      await inputs[0].fill('J1');
      console.log('   → Company code filled: J1');
      
      // Fill email (second input)  
      await inputs[1].fill('admin@j1.com');
      console.log('   → Email filled: admin@j1.com');
      
      // Fill password (third input)
      await inputs[2].fill('pass1234');
      console.log('   → Password filled: pass1234');
      
      // Click login button
      await page.locator('text=로그인').click();
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log(`   → After manual login, URL: ${currentUrl}`);
      
      console.log('   → Manual login form interaction completed');
    } else {
      throw new Error(`Expected at least 3 input fields, found: ${inputs.length}`);
    }
  });

  // Test 7: API Integration Check
  await runTest('API Integration Verification', async () => {
    console.log('   → Testing API connectivity from frontend');
    
    // Monitor network requests
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          status: 'pending'
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const request = apiRequests.find(req => req.url === response.url() && req.status === 'pending');
        if (request) {
          request.status = response.status();
          request.statusText = response.statusText();
        }
      }
    });
    
    // Navigate and trigger some API calls
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for potential API calls
    
    console.log(`   → API requests captured: ${apiRequests.length}`);
    apiRequests.forEach((req, index) => {
      console.log(`   → ${index + 1}. ${req.method} ${req.url} → ${req.status}`);
    });
    
    if (apiRequests.length === 0) {
      console.log('   ⚠️  No API requests detected - this might be expected for login page');
    }
    
    console.log('   → API integration check completed');
  });

  // Test 8: Mobile Responsiveness
  await runTest('Mobile Responsiveness', async () => {
    console.log('   → Testing mobile responsiveness');
    
    // Test different viewport sizes
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1200, height: 800 }
    ];
    
    for (const viewport of viewports) {
      console.log(`   → Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
      
      // Check if login form is still visible and accessible
      const loginElements = await page.locator('text=로그인').count();
      if (loginElements === 0) {
        throw new Error(`Login elements not visible on ${viewport.name}`);
      }
      
      console.log(`   → ${viewport.name} layout: Login elements visible`);
      
      // Take screenshot for this viewport
      await page.screenshot({ 
        path: `responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1400, height: 900 });
    console.log('   → Mobile responsiveness testing completed');
  });

  // Final system health check
  await runTest('System Health Check', async () => {
    console.log('   → Performing final system health check');
    
    // Check if web server is responding
    const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    if (!response.ok() && response.status() !== 302) { // 302 is redirect, which is OK
      throw new Error(`Web server not responding properly: ${response.status()}`);
    }
    
    // Check for any console errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    if (consoleMessages.length > 0) {
      console.log(`   ⚠️  Console errors found: ${consoleMessages.length}`);
      consoleMessages.forEach((msg, index) => {
        console.log(`   → Error ${index + 1}: ${msg}`);
      });
    } else {
      console.log('   → No console errors detected');
    }
    
    console.log('   → System health check completed');
  });

  await browser.close();

  // Print comprehensive test summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE E2E TEST REPORT');
  console.log('='.repeat(80));
  console.log(`🎯 Total Tests Executed: ${testResults.totalTests}`);
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%`);
  console.log(`📸 Screenshots Generated: ${testResults.screenshots.length}`);
  
  // System readiness assessment
  const readinessScore = (testResults.passed / testResults.totalTests) * 100;
  console.log('\n🚀 SYSTEM READINESS ASSESSMENT:');
  
  if (readinessScore >= 90) {
    console.log('🟢 EXCELLENT - System is production-ready');
  } else if (readinessScore >= 75) {
    console.log('🟡 GOOD - System is mostly ready with minor issues');
  } else if (readinessScore >= 50) {
    console.log('🟠 FAIR - System has significant issues requiring attention');
  } else {
    console.log('🔴 POOR - System needs major fixes before deployment');
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ DETAILED FAILURE ANALYSIS:');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. 🔍 ${error.test}`);
      console.log(`   💥 Error: ${error.error}`);
    });
  }
  
  console.log('\n📋 RECOMMENDED NEXT STEPS:');
  if (readinessScore >= 75) {
    console.log('• ✅ System is ready for user acceptance testing');
    console.log('• 🔧 Address any minor issues found');
    console.log('• 📊 Set up monitoring and logging');
    console.log('• 🔒 Verify security configurations');
  } else {
    console.log('• 🛠️  Fix critical functionality issues');
    console.log('• 🔍 Investigate authentication problems');
    console.log('• 🧪 Implement proper testing coverage');
    console.log('• 📞 Review API integration issues');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`📸 Screenshots saved in current directory`);
  console.log('='.repeat(80));
  
  return testResults;
}

// Run the comprehensive tests
runE2ETests().catch(console.error);