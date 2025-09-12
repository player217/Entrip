// Simple authentication test for J1 company
const { chromium } = require('playwright');

async function testLogin() {
  console.log('🧪 Testing J1 company login...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login
    await page.goto('http://localhost:3000/login');
    console.log('📍 Navigated to login page');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what we're working with
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('📸 Login page screenshot saved');
    
    // Try to find any login form elements
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]', 
      'input[placeholder*="email"]',
      'input[placeholder*="이메일"]',
      '#email',
      '.email',
      'input:first-of-type'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        emailInput = await page.$(selector);
        if (emailInput) {
          console.log(`✅ Found email input: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!emailInput) {
      console.log('❌ Could not find email input field');
      console.log('📄 Page title:', await page.title());
      console.log('🔗 Current URL:', page.url());
      return false;
    }
    
    // Fill in credentials
    await page.fill(emailSelectors.find(s => emailInput), 'admin@j1.com');
    console.log('📝 Filled email field');
    
    // Find password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password',
      '.password'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        passwordInput = await page.$(selector);
        if (passwordInput) {
          console.log(`✅ Found password input: ${selector}`);
          await page.fill(selector, 'pass1234');
          console.log('🔒 Filled password field');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!passwordInput) {
      console.log('❌ Could not find password input field');
      return false;
    }
    
    // Try to submit
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("로그인")',
      'button:has-text("Login")',
      '.login-button',
      '#login-button'
    ];
    
    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          console.log(`🔘 Found submit button: ${selector}`);
          await page.click(selector);
          submitted = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!submitted) {
      console.log('⚠️ Could not find submit button, trying Enter key');
      await page.press('input[type="password"]', 'Enter');
    }
    
    console.log('⏳ Waiting for authentication response...');
    
    // Wait for either redirect or error
    await Promise.race([
      page.waitForURL(url => !url.includes('/login'), { timeout: 10000 }),
      page.waitForSelector('.error-message, .alert, [role="alert"]', { timeout: 5000 })
    ]);
    
    const currentUrl = page.url();
    console.log('🔗 Current URL after login attempt:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      // Still on login page - check for errors
      const errorElement = await page.$('.error-message, .alert, [role="alert"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('❌ Login error:', errorText);
      } else {
        console.log('❌ Login failed - still on login page');
      }
      return false;
    } else {
      console.log('✅ Login successful - redirected to:', currentUrl);
      
      // Take screenshot of the authenticated page
      await page.screenshot({ path: 'authenticated-page.png', fullPage: true });
      console.log('📸 Authenticated page screenshot saved');
      
      // Wait a bit and check for content
      await page.waitForTimeout(3000);
      
      // Look for any booking-related content
      const hasBookings = await page.$('.booking, .calendar, .reservation, table tr:nth-child(2)');
      console.log('📊 Booking content found:', hasBookings ? 'Yes' : 'No');
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'error-page.png', fullPage: true });
    return false;
    
  } finally {
    await page.waitForTimeout(5000); // Keep browser open for 5 seconds to see result
    await browser.close();
  }
}

// Run the test
testLogin().then(success => {
  console.log('\n🎯 Test Result:', success ? 'PASSED ✅' : 'FAILED ❌');
}).catch(console.error);