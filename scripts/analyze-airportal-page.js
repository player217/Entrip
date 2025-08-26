const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser to analyze airportal page structure...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.airportal.go.kr/airport/aircraftInfo.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    await page.waitForTimeout(3000);
    
    // Get all table data
    const tables = await page.$$('table');
    console.log(`Found ${tables.length} tables on the page`);
    
    // Look for flight data in tables
    for (let i = 0; i < tables.length; i++) {
      const rows = await tables[i].$$('tr');
      console.log(`\nTable ${i + 1} has ${rows.length} rows`);
      
      // Check first few rows to understand structure
      for (let j = 0; j < Math.min(5, rows.length); j++) {
        const cells = await rows[j].$$('td, th');
        const rowData = [];
        for (const cell of cells) {
          const text = await cell.innerText();
          rowData.push(text.trim());
        }
        if (rowData.length > 0) {
          console.log(`Row ${j + 1}:`, rowData.join(' | '));
        }
      }
    }
    
    // Look specifically for Osaka flights
    console.log('\n\nSearching for Osaka/KIX flights...');
    const allText = await page.$$eval('*', elements => {
      return elements.map(el => el.innerText || '').filter(text => 
        text && (text.includes('오사카') || text.includes('간사이') || text.includes('KIX') || text.includes('OSA'))
      );
    });
    
    if (allText.length > 0) {
      console.log('Found Osaka-related content:');
      allText.forEach(text => console.log(' -', text.substring(0, 200)));
    } else {
      console.log('No Osaka flights found in current view');
    }
    
    // Check for Excel download functionality
    const downloadButtons = await page.$$('[onclick*="excel"], [onclick*="Excel"], button:has-text("엑셀"), a:has-text("엑셀")');
    console.log(`\nFound ${downloadButtons.length} potential Excel download buttons`);
    
    // Get page URL to understand navigation
    console.log('\nCurrent URL:', page.url());
    
    // Take final screenshot
    await page.screenshot({ path: 'airportal-analysis.png', fullPage: true });
    console.log('Screenshot saved as airportal-analysis.png');
    
    console.log('\nKeeping browser open for manual inspection...');
    console.log('You can manually:');
    console.log('1. Select 김해공항 as departure');
    console.log('2. Look for 오사카/간사이 in arrivals');
    console.log('3. Download Excel file');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();