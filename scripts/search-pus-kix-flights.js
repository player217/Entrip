const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  console.log('Navigating to airportal.go.kr flight search...');
  
  try {
    // Navigate to the aircraft info page
    await page.goto('https://www.airportal.go.kr/airport/aircraftInfo.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    
    // Click on the "실시간 운항정보" menu if needed
    const menuItems = await page.$$('a, button');
    for (const item of menuItems) {
      const text = await item.textContent();
      if (text && text.includes('실시간 운항정보')) {
        console.log('Found flight info menu, clicking...');
        await item.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Look for departure/arrival selectors or search functionality
    await page.waitForTimeout(2000);
    
    // Try to find and click on international flights section
    const intlFlightLink = await page.$('a:has-text("국제선"), button:has-text("국제선")');
    if (intlFlightLink) {
      console.log('Found international flights link, clicking...');
      await intlFlightLink.click();
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'airportal-flight-search.png', fullPage: true });
    console.log('Screenshot saved as airportal-flight-search.png');
    
    // Try to find departure airport field
    const depFields = await page.$$('input[placeholder*="출발"], select[name*="dep"], input[name*="dep"]');
    console.log(`Found ${depFields.length} departure fields`);
    
    // Try to find arrival airport field  
    const arrFields = await page.$$('input[placeholder*="도착"], select[name*="arr"], input[name*="arr"]');
    console.log(`Found ${arrFields.length} arrival fields`);
    
    // Look for any visible forms or search areas
    const forms = await page.$$('form');
    console.log(`Found ${forms.length} forms on the page`);
    
    // Get all visible text to understand the page structure
    const pageText = await page.innerText('body');
    console.log('Page contains text about:', pageText.substring(0, 500));
    
    // Keep browser open for inspection
    console.log('\nBrowser will remain open for manual inspection.');
    console.log('Look for:');
    console.log('1. 출발/도착 공항 선택 필드');
    console.log('2. 조회 버튼');
    console.log('3. 엑셀 다운로드 버튼');
    console.log('\nPress Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();