const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Analyzing flight data structure from airportal...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.airportal.go.kr/airline/airplaneSchedule.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded, waiting for content...');
    await page.waitForTimeout(3000);
    
    // First, let's understand the table structure
    const tableInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const info = [];
      
      tables.forEach((table, index) => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
        const firstRow = table.querySelector('tr:nth-child(2)'); // Skip header row
        const firstRowData = firstRow ? Array.from(firstRow.querySelectorAll('td')).map(td => td.innerText.trim()) : [];
        
        info.push({
          tableIndex: index,
          headers: headers,
          firstRowData: firstRowData,
          totalRows: table.querySelectorAll('tr').length
        });
      });
      
      return info;
    });
    
    console.log('\n=== TABLE STRUCTURE ANALYSIS ===');
    tableInfo.forEach(table => {
      console.log(`\nTable ${table.tableIndex}:`);
      console.log('Headers:', table.headers);
      console.log('First row data:', table.firstRowData);
      console.log('Total rows:', table.totalRows);
    });
    
    // Now let's properly extract flight data
    console.log('\n=== EXTRACTING PROPER FLIGHT DATA ===');
    
    // Select PUS as departure airport for testing
    const departureSelect = await page.$('select#depAirportCode, select[name*="dep"]');
    if (departureSelect) {
      await departureSelect.selectOption('PUS');
      console.log('Selected PUS (김해공항) as departure');
      await page.waitForTimeout(2000);
    }
    
    // Click search/submit button
    const searchButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("조회")');
    if (searchButton) {
      await searchButton.click();
      console.log('Clicked search button');
      await page.waitForTimeout(3000);
    }
    
    // Extract flight data with proper column mapping
    const flightData = await page.evaluate(() => {
      const flights = [];
      const rows = document.querySelectorAll('table tr');
      
      // Find the header row to understand column positions
      let headerRow = null;
      let headerIndex = -1;
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('th');
        if (cells.length > 0) {
          headerRow = Array.from(cells).map(th => th.innerText.trim());
          headerIndex = i;
          break;
        }
      }
      
      console.log('Found headers:', headerRow);
      
      // Process data rows
      for (let i = headerIndex + 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 4) {
          const rowData = Array.from(cells).map(td => td.innerText.trim());
          
          // Try to identify columns based on content patterns
          let flight = {
            rawData: rowData
          };
          
          // Common patterns:
          // Airline name usually contains "항공" or is recognizable
          // Flight number usually starts with letters followed by numbers
          // Time format is usually HH:MM
          
          rowData.forEach((cell, index) => {
            if (cell.includes('항공') || ['대한항공', '아시아나', '진에어', '티웨이', '에어부산', '제주항공', '이스타'].some(airline => cell.includes(airline))) {
              flight.airline = cell;
            } else if (/^[A-Z]{2}\d{1,4}$/.test(cell)) {
              flight.flightNo = cell;
            } else if (/^\d{2}:\d{2}$/.test(cell) && !flight.departureTime) {
              flight.departureTime = cell;
            } else if (/^\d{2}:\d{2}$/.test(cell) && flight.departureTime && !flight.arrivalTime) {
              flight.arrivalTime = cell;
            } else if (cell.length === 3 && /^[A-Z]{3}$/.test(cell)) {
              flight.destinationCode = cell;
            } else if (cell.includes('(') && cell.includes(')')) {
              flight.destination = cell;
            }
          });
          
          flights.push(flight);
        }
      }
      
      return { headers: headerRow, flights: flights };
    });
    
    console.log('\nExtracted data structure:');
    console.log('Headers:', flightData.headers);
    console.log(`Total flights found: ${flightData.flights.length}`);
    
    // Show first 10 flights
    console.log('\nFirst 10 flights:');
    flightData.flights.slice(0, 10).forEach((flight, index) => {
      console.log(`\nFlight ${index + 1}:`);
      console.log('  Raw data:', flight.rawData);
      console.log('  Parsed:', {
        airline: flight.airline || 'Not found',
        flightNo: flight.flightNo || 'Not found',
        destination: flight.destination || flight.destinationCode || 'Not found',
        departure: flight.departureTime || 'Not found',
        arrival: flight.arrivalTime || 'Not found'
      });
    });
    
    // Save analysis results
    const analysisFile = path.join(__dirname, '..', 'downloads', 'flight-data-analysis.json');
    fs.writeFileSync(
      analysisFile,
      JSON.stringify({
        analyzedAt: new Date().toISOString(),
        tableInfo: tableInfo,
        sampleData: flightData
      }, null, 2),
      'utf8'
    );
    
    console.log(`\nAnalysis saved to: downloads/flight-data-analysis.json`);
    console.log('\nBrowser will remain open for manual inspection.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();