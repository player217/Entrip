const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching browser to extract all airports schedule data...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  console.log('Navigating to airplane schedule page...');
  
  try {
    await page.goto('https://www.airportal.go.kr/airline/airplaneSchedule.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'airplane-schedule-page.png', fullPage: true });
    console.log('Screenshot saved as airplane-schedule-page.png');
    
    // Look for airport selectors
    const airportSelects = await page.$$('select[name*="airport"], select[id*="airport"]');
    console.log(`Found ${airportSelects.length} airport select elements`);
    
    // Try to find departure and arrival airport dropdowns
    const selects = await page.$$('select');
    for (let i = 0; i < selects.length; i++) {
      const options = await selects[i].$$('option');
      if (options.length > 10) { // Likely an airport list
        console.log(`\nSelect ${i + 1} has ${options.length} options:`);
        
        const airportList = [];
        for (const option of options) {
          const value = await option.getAttribute('value');
          const text = await option.innerText();
          if (value && text && value !== '') {
            airportList.push({ code: value, name: text.trim() });
            console.log(`  - ${value}: ${text.trim()}`);
          }
        }
        
        // Save airport list to file
        if (airportList.length > 0) {
          const fs = require('fs');
          const filename = `airport-list-${i + 1}.json`;
          fs.writeFileSync(
            path.join(__dirname, '..', 'downloads', filename),
            JSON.stringify(airportList, null, 2),
            'utf8'
          );
          console.log(`\nSaved ${airportList.length} airports to downloads/${filename}`);
        }
      }
    }
    
    // Look for any visible airport lists in tables
    const tables = await page.$$('table');
    console.log(`\nFound ${tables.length} tables on the page`);
    
    // Check for Excel download button
    const excelButtons = await page.$$('button:has-text("엑셀"), a:has-text("엑셀"), [onclick*="excel"]');
    console.log(`\nFound ${excelButtons.length} Excel download buttons`);
    
    if (excelButtons.length > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      
      console.log('Clicking Excel download button...');
      await excelButtons[0].click();
      
      try {
        const download = await downloadPromise;
        const suggestedFilename = download.suggestedFilename();
        const downloadPath = path.join(__dirname, '..', 'downloads', suggestedFilename);
        
        console.log(`Downloading: ${suggestedFilename}`);
        await download.saveAs(downloadPath);
        console.log(`Successfully saved to: ${downloadPath}`);
      } catch (downloadError) {
        console.log('Excel download might require additional steps');
      }
    }
    
    // Extract any visible schedule data
    const scheduleData = await page.evaluate(() => {
      const data = [];
      const rows = document.querySelectorAll('tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 3) {
          const rowData = Array.from(cells).map(cell => cell.innerText.trim());
          data.push(rowData);
        }
      });
      
      return data;
    });
    
    if (scheduleData.length > 0) {
      console.log(`\nExtracted ${scheduleData.length} rows of schedule data`);
      console.log('First few rows:', scheduleData.slice(0, 5));
    }
    
    console.log('\nBrowser will remain open for manual inspection.');
    console.log('You can manually explore the page to find more data.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();