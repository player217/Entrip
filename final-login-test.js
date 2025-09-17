const { chromium } = require('playwright');

async function testActualLogin() {
  console.log('🔐 Testing Actual Login Functionality...\n');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();
  
  // Monitor network requests to see API calls
  const apiCalls = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        method: request.method(),
        url: request.url(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 API Response: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('📋 Step 1: Navigate to login page');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    console.log('📋 Step 2: Fill manual login form');
    const inputs = await page.locator('input').all();
    
    // Fill the form fields
    await inputs[0].fill('J1'); // Company code
    await inputs[1].fill('admin@j1.com'); // Email
    await inputs[2].fill('pass1234'); // Password
    
    console.log('   → Form filled with J1 admin credentials');
    
    console.log('📋 Step 3: Click login button (specifically the button)');
    // Click the specific login button, not the heading
    await page.locator('button[type="submit"]').click();
    
    console.log('📋 Step 4: Wait for authentication response');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`   → Current URL after login: ${currentUrl}`);
    
    // Take screenshot after login attempt
    await page.screenshot({ 
      path: 'after-login-attempt.png',
      fullPage: true 
    });
    
    console.log('📋 Step 5: Check authentication status');
    
    if (currentUrl.includes('/login')) {
      console.log('   ⚠️  Still on login page - checking for error messages');
      
      // Look for error messages
      const errorSelectors = [
        '.error', '.alert', '.toast', 
        '[class*="error"]', '[class*="alert"]',
        'text=오류', 'text=실패', 'text=Error'
      ];
      
      for (const selector of errorSelectors) {
        const errorElements = await page.locator(selector).count();
        if (errorElements > 0) {
          const errorText = await page.locator(selector).first().textContent();
          console.log(`   💥 Error found: ${errorText}`);
        }
      }
      
      // Check network tab for failed requests
      console.log(`   📡 API calls made: ${apiCalls.length}`);
      apiCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.method} ${call.url}`);
      });
      
    } else {
      console.log('   ✅ Successfully navigated away from login page!');
      console.log('   🎉 Authentication appears successful');
      
      // Look for authenticated content
      const authElements = [
        'nav', '.nav', 'header', '.header', 
        '.sidebar', '.dashboard', '.user-menu'
      ];
      
      for (const selector of authElements) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`   → Found authenticated UI element: ${selector} (${count})`);
        }
      }
    }
    
    console.log('📋 Step 6: Test booking data access');
    // Try to access booking data
    try {
      await page.goto('http://localhost:3000/calendar-monthly', { waitUntil: 'networkidle', timeout: 10000 });
      const calendarUrl = page.url();
      
      if (calendarUrl.includes('/calendar-monthly')) {
        console.log('   ✅ Successfully accessed calendar page');
        
        // Look for calendar elements
        const calendarElements = await page.locator('.calendar, [class*="calendar"], .month').count();
        console.log(`   → Calendar components found: ${calendarElements}`);
        
        // Take screenshot of calendar
        await page.screenshot({ 
          path: 'calendar-page.png',
          fullPage: true 
        });
        
      } else if (calendarUrl.includes('/login')) {
        console.log('   ⚠️  Redirected back to login when accessing calendar');
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not access calendar page: ${error.message}`);
    }
    
    console.log('📋 Step 7: Test different company login');
    // Test HAPPY company login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Look for HAPPY quick login button
    const happyButton = page.locator('text=해피 관리자');
    if (await happyButton.count() > 0) {
      console.log('   → Testing HAPPY quick login button');
      await happyButton.click();
      await page.waitForTimeout(3000);
      
      const happyUrl = page.url();
      console.log(`   → After HAPPY quick login: ${happyUrl}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'happy-login-result.png',
        fullPage: true 
      });
    }
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
    await page.screenshot({ 
      path: 'login-test-error.png',
      fullPage: true 
    });
  }
  
  await browser.close();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔐 LOGIN FUNCTIONALITY TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`📡 Total API calls made: ${apiCalls.length}`);
  
  if (apiCalls.length > 0) {
    console.log('📋 API Calls Details:');
    apiCalls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.method} ${call.url}`);
    });
  }
  
  console.log('\n📸 Screenshots saved:');
  console.log('  • after-login-attempt.png');
  console.log('  • calendar-page.png (if accessible)');
  console.log('  • happy-login-result.png');
  console.log('='.repeat(60));
}

testActualLogin().catch(console.error);