const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractScheduleForAirport(page, airportCode, airportName) {
  console.log(`\n=== Extracting schedule for ${airportName} (${airportCode}) ===`);
  
  try {
    // Select departure airport
    const departureSelect = await page.$('select#depAirportCode, select[name="depAirportCode"]');
    if (departureSelect) {
      await departureSelect.selectOption(airportCode);
      console.log(`Selected ${airportCode} as departure airport`);
      await page.waitForTimeout(2000);
    }
    
    // Click search button if exists
    const searchButton = await page.$('button:has-text("조회"), button:has-text("검색"), input[type="submit"]');
    if (searchButton) {
      await searchButton.click();
      console.log('Clicked search button');
      await page.waitForTimeout(3000);
    }
    
    // Extract schedule data
    const scheduleData = await page.evaluate(() => {
      const flights = [];
      const rows = document.querySelectorAll('tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const airline = cells[0]?.innerText?.trim();
          const flightNo = cells[1]?.innerText?.trim();
          const destination = cells[2]?.innerText?.trim();
          const departureTime = cells[3]?.innerText?.trim();
          const arrivalTime = cells[4]?.innerText?.trim();
          
          if (airline && flightNo && destination) {
            flights.push({
              airline,
              flightNo,
              destination,
              departureTime: departureTime || '',
              arrivalTime: arrivalTime || ''
            });
          }
        }
      });
      
      return flights;
    });
    
    return scheduleData;
    
  } catch (error) {
    console.error(`Error extracting schedule for ${airportCode}:`, error.message);
    return [];
  }
}

(async () => {
  console.log('Starting comprehensive airport schedule extraction...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the schedule page
    await page.goto('https://www.airportal.go.kr/airline/airplaneSchedule.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    await page.waitForTimeout(3000);
    
    // Get list of Korean airports
    const koreanAirports = [
      { code: 'ICN', name: '인천공항' },
      { code: 'GMP', name: '김포공항' },
      { code: 'PUS', name: '김해공항' },
      { code: 'CJU', name: '제주공항' },
      { code: 'TAE', name: '대구공항' },
      { code: 'KWJ', name: '광주공항' },
      { code: 'CJJ', name: '청주공항' },
      { code: 'YNY', name: '양양공항' },
      { code: 'RSU', name: '여수공항' },
      { code: 'USN', name: '울산공항' },
      { code: 'KPO', name: '포항경주공항' },
      { code: 'MWX', name: '무안공항' },
      { code: 'KUV', name: '군산공항' },
      { code: 'WJU', name: '원주공항' },
      { code: 'HIN', name: '사천공항' }
    ];
    
    const allSchedules = {};
    
    // Extract schedule for each airport
    for (const airport of koreanAirports) {
      const scheduleData = await extractScheduleForAirport(page, airport.code, airport.name);
      
      if (scheduleData.length > 0) {
        allSchedules[airport.code] = {
          airportName: airport.name,
          totalFlights: scheduleData.length,
          flights: scheduleData
        };
        
        console.log(`Found ${scheduleData.length} flights from ${airport.name}`);
        
        // Save individual airport schedule
        const airportFilename = `schedule-${airport.code}.json`;
        fs.writeFileSync(
          path.join(__dirname, '..', 'downloads', airportFilename),
          JSON.stringify({
            airport: airport,
            extractedAt: new Date().toISOString(),
            flights: scheduleData
          }, null, 2),
          'utf8'
        );
        console.log(`Saved to downloads/${airportFilename}`);
      }
      
      // Add delay between airports to avoid overloading
      await page.waitForTimeout(2000);
    }
    
    // Save comprehensive schedule file
    const comprehensiveFilename = 'all-airports-schedule.json';
    fs.writeFileSync(
      path.join(__dirname, '..', 'downloads', comprehensiveFilename),
      JSON.stringify({
        extractedAt: new Date().toISOString(),
        totalAirports: Object.keys(allSchedules).length,
        schedules: allSchedules
      }, null, 2),
      'utf8'
    );
    
    console.log(`\n=== EXTRACTION COMPLETE ===`);
    console.log(`Total airports processed: ${Object.keys(allSchedules).length}`);
    console.log(`Comprehensive data saved to downloads/${comprehensiveFilename}`);
    
    // Summary statistics
    console.log('\n=== SUMMARY ===');
    for (const [code, data] of Object.entries(allSchedules)) {
      console.log(`${code} (${data.airportName}): ${data.totalFlights} flights`);
    }
    
    console.log('\nBrowser will remain open for verification.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();