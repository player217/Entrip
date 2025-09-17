const { chromium } = require('playwright');

async function debugLoginPage() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🔍 Debugging login page...');
    
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'login-page-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: login-page-debug.png');
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🌐 Current URL: ${url}`);
    
    // Check for any error messages
    const pageText = await page.textContent('body');
    console.log(`📝 Page contains error keywords: ${/error|에러|오류|failed|실패/.test(pageText)}`);
    
    // Look for demo buttons
    const demoButtons = await page.locator('button:has-text("J1"), button:has-text("해피"), button:has-text("스타"), button:has-text("본사")').count();
    console.log(`🔘 Demo buttons found: ${demoButtons}`);
    
    // List all buttons on page
    const allButtons = await page.locator('button').all();
    console.log(`🔘 All buttons on page: ${allButtons.length}`);
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const buttonText = await allButtons[i].innerText();
      console.log(`   Button ${i + 1}: "${buttonText}"`);
    }
    
    // Check if we can find the specific demo buttons
    const demoButtonTexts = ['J1 관리자', '해피 관리자', '스타 관리자', '본사 관리자'];
    for (const buttonText of demoButtonTexts) {
      const button = page.locator(`button:has-text("${buttonText}")`);
      const exists = await button.count() > 0;
      console.log(`🔍 "${buttonText}" button exists: ${exists}`);
      if (exists) {
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        console.log(`   Visible: ${isVisible}, Enabled: ${isEnabled}`);
      }
    }
    
    // Try to click one demo button to see what happens
    const j1Button = page.locator('button:has-text("J1 관리자")');
    if (await j1Button.count() > 0) {
      console.log('🔄 Attempting to click J1 관리자 button...');
      await j1Button.click();
      await page.waitForTimeout(5000);
      
      const newUrl = page.url();
      const newPageText = await page.textContent('body');
      console.log(`🌐 URL after click: ${newUrl}`);
      console.log(`📝 Login successful: ${!newUrl.includes('/login')}`);
      
      if (newUrl.includes('/login')) {
        console.log('❌ Still on login page - checking for error messages');
        const hasError = /error|에러|오류|failed|실패|invalid|잘못/.test(newPageText);
        console.log(`📝 Error message detected: ${hasError}`);
        
        if (hasError) {
          // Find specific error text
          const errorMatch = newPageText.match(/(error|에러|오류|failed|실패|invalid|잘못)[^.]*[.!?]?/i);
          if (errorMatch) {
            console.log(`📝 Error message: "${errorMatch[0]}"`);
          }
        }
      } else {
        console.log('✅ Login appears successful!');
      }
    }
    
    // Take another screenshot after interaction
    await page.screenshot({ path: 'login-page-after-click.png', fullPage: true });
    console.log('📸 After-click screenshot saved: login-page-after-click.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Run debug
debugLoginPage()
  .then(() => {
    console.log('✅ Debug completed');
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
  });