const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser to get PUS-KIX real-time flight data...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate directly to the flight search page
    await page.goto('https://www.airportal.go.kr/airport/aircraftInfo.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded, looking for departure selector...');
    await page.waitForTimeout(2000);
    
    // Select departure airport - 김해공항 (PUS)
    const depSelect = await page.$('select:has(option:has-text("김해공항"))');
    if (depSelect) {
      console.log('Found departure selector, selecting 김해공항...');
      await depSelect.selectOption({ label: '김해공항' });
      await page.waitForTimeout(1000);
    }
    
    // Click on 도착 (Arrival) tab
    const arrivalTab = await page.$('button:has-text("도착"), a:has-text("도착")');
    if (arrivalTab) {
      console.log('Clicking arrival tab...');
      await arrivalTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'pus-arrivals.png', fullPage: true });
    console.log('Screenshot saved as pus-arrivals.png');
    
    // Look for Excel download button
    const excelButtons = await page.$$('button:has-text("엑셀"), a:has-text("엑셀"), button:has-text("Excel"), a:has-text("Excel")');
    console.log(`Found ${excelButtons.length} Excel download buttons`);
    
    if (excelButtons.length > 0) {
      console.log('Found Excel download button!');
      
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      
      console.log('Clicking Excel download button...');
      await excelButtons[0].click();
      
      try {
        const download = await downloadPromise;
        const suggestedFilename = download.suggestedFilename();
        const filePath = `C:\\Users\\PC\\Documents\\project\\Entrip\\downloads\\${suggestedFilename}`;
        
        console.log(`Downloading file: ${suggestedFilename}`);
        await download.saveAs(filePath);
        console.log(`File saved to: ${filePath}`);
      } catch (downloadError) {
        console.log('Download might have failed or opened in a new window');
      }
    }
    
    // Now let's look for flights to Osaka
    await page.waitForTimeout(2000);
    
    // Try to find Osaka/KIX in the flight list
    const flightRows = await page.$$('tr');
    console.log(`Found ${flightRows.length} table rows`);
    
    let osakaFlights = [];
    for (const row of flightRows) {
      const text = await row.innerText();
      if (text && (text.includes('오사카') || text.includes('간사이') || text.includes('KIX') || text.includes('OSA'))) {
        console.log('Found Osaka flight:', text);
        osakaFlights.push(text);
      }
    }
    
    console.log(`\nTotal Osaka flights found: ${osakaFlights.length}`);
    
    // Keep browser open
    console.log('\nBrowser will remain open. You can:');
    console.log('1. Manually check for 오사카/간사이 flights');
    console.log('2. Download Excel file with all flight data');
    console.log('3. Change departure/arrival airports');
    console.log('\nPress Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();