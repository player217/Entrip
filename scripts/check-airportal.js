const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down actions for visibility
  });
  
  const page = await browser.newPage();
  console.log('Navigating to airportal.go.kr...');
  
  try {
    await page.goto('https://www.airportal.go.kr/airport/aircraftInfo.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    console.log('Current URL:', page.url());
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'airportal-homepage.png' });
    console.log('Screenshot saved as airportal-homepage.png');
    
    // Look for departure airport selector
    const departureSelector = await page.$('select[name="depAirportCode"], #depAirportCode, input[placeholder*="출발"]');
    if (departureSelector) {
      console.log('Found departure airport selector');
    }
    
    // Keep browser open for manual inspection
    console.log('Browser will remain open. Press Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();