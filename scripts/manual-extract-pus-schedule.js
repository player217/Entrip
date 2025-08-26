const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Manual extraction of PUS flight schedule with visual inspection...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the schedule page
    await page.goto('https://www.airportal.go.kr/airline/airplaneSchedule.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded, taking initial screenshot...');
    await page.screenshot({ path: 'schedule-page-initial.png', fullPage: true });
    
    // Wait for user to see the page
    await page.waitForTimeout(3000);
    
    // Look for all selects and their options
    const selectInfo = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const info = [];
      
      selects.forEach((select, index) => {
        const options = Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text
        }));
        
        info.push({
          index: index,
          id: select.id,
          name: select.name,
          optionCount: options.length,
          firstFewOptions: options.slice(0, 5)
        });
      });
      
      return info;
    });
    
    console.log('\n=== SELECT ELEMENTS FOUND ===');
    selectInfo.forEach(s => {
      console.log(`\nSelect ${s.index}:`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Options: ${s.optionCount}`);
      console.log(`  First options:`, s.firstFewOptions);
    });
    
    // Try to find and select PUS
    console.log('\n=== ATTEMPTING TO SELECT PUS ===');
    
    // Method 1: Try by index
    const pusSelectIndex = selectInfo.findIndex(s => 
      s.firstFewOptions.some(opt => opt.value === 'PUS' || opt.text.includes('김해'))
    );
    
    if (pusSelectIndex >= 0) {
      console.log(`Found PUS in select ${pusSelectIndex}`);
      const selects = await page.$$('select');
      await selects[pusSelectIndex].selectOption('PUS');
      console.log('Selected PUS');
      await page.waitForTimeout(2000);
    }
    
    // Look for any visible flight data
    const visibleData = await page.evaluate(() => {
      // Get all text content from the page
      const allText = document.body.innerText;
      
      // Look for flight patterns
      const flightPattern = /([A-Z]{2}\d{3,4})/g;
      const flights = allText.match(flightPattern) || [];
      
      // Look for time patterns
      const timePattern = /\d{2}:\d{2}/g;
      const times = allText.match(timePattern) || [];
      
      // Look for airport codes
      const airportPattern = /\b[A-Z]{3}\b/g;
      const airports = allText.match(airportPattern) || [];
      
      return {
        flights: [...new Set(flights)].slice(0, 20),
        times: [...new Set(times)].slice(0, 20),
        airports: [...new Set(airports)].slice(0, 20)
      };
    });
    
    console.log('\n=== VISIBLE DATA PATTERNS ===');
    console.log('Flight numbers found:', visibleData.flights);
    console.log('Times found:', visibleData.times);
    console.log('Airport codes found:', visibleData.airports);
    
    // Try to extract table data directly
    const tableData = await page.evaluate(() => {
      const data = [];
      const tables = document.querySelectorAll('table');
      
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        const tableRows = [];
        
        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim());
          if (cells.length > 0) {
            tableRows.push(cells);
          }
        });
        
        if (tableRows.length > 0) {
          data.push({
            tableIndex,
            rowCount: tableRows.length,
            headers: tableRows[0],
            sampleRows: tableRows.slice(1, 6) // First 5 data rows
          });
        }
      });
      
      return data;
    });
    
    console.log('\n=== TABLE DATA ===');
    tableData.forEach(table => {
      console.log(`\nTable ${table.tableIndex}:`);
      console.log('Headers:', table.headers);
      console.log('Sample rows:');
      table.sampleRows.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, row);
      });
    });
    
    // Take final screenshot
    await page.screenshot({ path: 'schedule-page-with-data.png', fullPage: true });
    console.log('\nScreenshots saved for manual inspection');
    
    // Save raw data for analysis
    fs.writeFileSync(
      path.join(__dirname, '..', 'downloads', 'raw-page-data.json'),
      JSON.stringify({
        extractedAt: new Date().toISOString(),
        selectInfo,
        visibleData,
        tableData
      }, null, 2),
      'utf8'
    );
    
    console.log('Raw data saved to downloads/raw-page-data.json');
    console.log('\nBrowser will remain open. Please manually:');
    console.log('1. Select 김해공항 (PUS) from the departure dropdown');
    console.log('2. Look for destination information in the table');
    console.log('3. Check if there are any KIX/오사카 flights listed');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();