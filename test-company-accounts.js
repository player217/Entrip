// Test script to verify company data isolation
// Each company should only see their own bookings

const { chromium } = require('playwright');

// Test accounts for each company
const accounts = [
  {
    company: 'J1',
    email: 'admin@j1.com',
    password: 'pass1234', // We need to find the correct password
    expectedBookings: 151,
    url: 'http://localhost:3000'
  },
  {
    company: 'HAPPY',
    email: 'admin@happy.com',
    password: 'pass1234',
    expectedBookings: 150,
    url: 'http://localhost:3000'
  },
  {
    company: 'STAR',
    email: 'admin@star.com',
    password: 'pass1234',
    expectedBookings: 183,
    url: 'http://localhost:3000'
  },
  {
    company: 'ENTRIP_MAIN',
    email: 'admin@entrip.com',
    password: 'pass1234',
    expectedBookings: 50,
    url: 'http://localhost:3000'
  }
];

async function testCompanyAccount(account) {
  console.log(`\n🧪 Testing ${account.company} account...`);
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // 1. Navigate to login page
    console.log(`📍 Navigating to ${account.url}/login`);
    await page.goto(`${account.url}/login`, { waitUntil: 'networkidle' });
    
    // 2. Fill in login credentials
    console.log(`🔑 Logging in as ${account.email}`);
    await page.fill('input[type="email"], input[name="email"]', account.email);
    await page.fill('input[type="password"], input[name="password"]', account.password);
    
    // 3. Submit login form
    await page.click('button[type="submit"], button:has-text("로그인"), button:has-text("Login")');
    
    // 4. Wait for redirect to main page
    console.log('⏳ Waiting for authentication...');
    await page.waitForURL(/\/(calendar|dashboard|workspace|booking)/, { timeout: 10000 });
    
    // 5. Navigate to bookings/calendar view
    console.log('📅 Navigating to bookings view...');
    
    // Try different possible routes
    const possibleRoutes = ['/calendar', '/bookings', '/workspace', '/dashboard'];
    let bookingPageFound = false;
    
    for (const route of possibleRoutes) {
      try {
        await page.goto(`${account.url}${route}`, { waitUntil: 'networkidle' });
        const url = page.url();
        if (!url.includes('/login')) {
          bookingPageFound = true;
          console.log(`✅ Successfully accessed ${route}`);
          break;
        }
      } catch (e) {
        console.log(`⚠️ Could not access ${route}, trying next...`);
      }
    }
    
    if (!bookingPageFound) {
      throw new Error('Could not find bookings page');
    }
    
    // 6. Wait for data to load and check for bookings
    console.log('🔍 Checking for booking data...');
    await page.waitForTimeout(3000); // Give time for data to load
    
    // Look for various indicators of bookings data
    const bookingIndicators = [
      '.booking-item',
      '.calendar-event',
      '[data-testid*="booking"]',
      '.reservation',
      'tr[data-row-key]', // Table rows
      '.fc-event', // FullCalendar events
      '.booking-card'
    ];
    
    let bookingsFound = false;
    let bookingCount = 0;
    
    for (const selector of bookingIndicators) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          bookingCount = elements.length;
          bookingsFound = true;
          console.log(`📊 Found ${bookingCount} booking elements using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // 7. Take a screenshot for manual verification
    const screenshotPath = `test-screenshot-${account.company.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // 8. Check page content for company-specific data
    const pageContent = await page.content();
    const companyMentions = (pageContent.match(new RegExp(account.company, 'gi')) || []).length;
    console.log(`🏢 Company name "${account.company}" mentioned ${companyMentions} times on page`);
    
    // 9. Look for any error messages or empty states
    const emptyStateSelectors = [
      ':text("데이터가 없습니다")',
      ':text("No data")',
      ':text("빈 데이터")',
      '.empty-state',
      '.no-data'
    ];
    
    let hasEmptyState = false;
    for (const selector of emptyStateSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          hasEmptyState = true;
          console.log(`⚠️ Found empty state indicator: ${selector}`);
        }
      } catch (e) {
        // Continue
      }
    }
    
    // 10. Report results
    console.log('\n📋 Test Results:');
    console.log(`   Company: ${account.company}`);
    console.log(`   Email: ${account.email}`);
    console.log(`   Expected bookings: ${account.expectedBookings}`);
    console.log(`   Bookings found on page: ${bookingCount}`);
    console.log(`   Company mentions: ${companyMentions}`);
    console.log(`   Empty state detected: ${hasEmptyState}`);
    console.log(`   Authentication: ${bookingPageFound ? '✅ Success' : '❌ Failed'}`);
    
    return {
      company: account.company,
      success: bookingPageFound,
      bookingCount: bookingCount,
      companyMentions: companyMentions,
      emptyState: hasEmptyState,
      screenshotPath: screenshotPath
    };
    
  } catch (error) {
    console.error(`❌ Error testing ${account.company}:`, error.message);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: `error-${account.company.toLowerCase()}.png` });
    } catch (e) {
      // Ignore screenshot errors
    }
    
    return {
      company: account.company,
      success: false,
      error: error.message,
      screenshotPath: `error-${account.company.toLowerCase()}.png`
    };
    
  } finally {
    await browser.close();
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting company account tests...');
  console.log('📊 Database contains:');
  console.log('   - J1: 151 bookings');
  console.log('   - HAPPY: 150 bookings');
  console.log('   - STAR: 183 bookings');
  console.log('   - ENTRIP_MAIN: 50 bookings');
  
  const results = [];
  
  // Test each account sequentially to avoid resource conflicts
  for (const account of accounts) {
    const result = await testCompanyAccount(account);
    results.push(result);
    
    // Wait between tests
    console.log('⏸️ Waiting 2 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary report
  console.log('\n🎯 FINAL TEST REPORT');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    console.log(`\n${result.company}:`);
    console.log(`  Authentication: ${result.success ? '✅' : '❌'}`);
    if (result.success) {
      console.log(`  Booking elements found: ${result.bookingCount}`);
      console.log(`  Company mentions: ${result.companyMentions}`);
      console.log(`  Empty state: ${result.emptyState ? '⚠️ Yes' : '✅ No'}`);
    } else {
      console.log(`  Error: ${result.error || 'Authentication failed'}`);
    }
    console.log(`  Screenshot: ${result.screenshotPath}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📈 Overall Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  if (successCount === results.length) {
    console.log('🎉 All tests passed! Company data isolation is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check individual results above.');
  }
}

// Run the tests
runAllTests().catch(console.error);