const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractFlightSchedule(page, departureCode, departureName) {
  console.log(`\n=== Extracting flights from ${departureName} (${departureCode}) ===`);
  
  try {
    // Navigate to the main schedule page
    await page.goto('https://www.airportal.go.kr/airline/airplaneSchedule.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(2000);
    
    // Select departure airport
    const depSelect = await page.$('select#depAirportCode');
    if (!depSelect) {
      console.log('Departure select not found, trying alternative selector...');
      const altSelect = await page.$('select[name="depAirportCode"]');
      if (altSelect) {
        await altSelect.selectOption(departureCode);
      }
    } else {
      await depSelect.selectOption(departureCode);
    }
    
    console.log(`Selected ${departureCode} as departure airport`);
    await page.waitForTimeout(1000);
    
    // Submit form or click search
    const submitButton = await page.$('input[type="submit"], button[type="submit"], button:has-text("조회")');
    if (submitButton) {
      await submitButton.click();
      console.log('Clicked search button');
      await page.waitForTimeout(3000);
    }
    
    // Extract complete flight data
    const flightData = await page.evaluate(() => {
      const flights = [];
      const table = document.querySelector('table');
      
      if (!table) return flights;
      
      // Get all rows except header
      const rows = table.querySelectorAll('tr');
      
      for (let i = 1; i < rows.length; i++) { // Skip header row
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 4) {
          // Extract text from each cell
          const cellTexts = Array.from(cells).map(td => td.innerText.trim());
          
          // Parse based on expected structure
          const flight = {
            airline: cellTexts[0] || '',
            flightNo: cellTexts[1] || '',
            destination: 'Unknown', // Will be determined from context
            departureTime: '',
            arrivalTime: '',
            schedule: {
              mon: false,
              tue: false,
              wed: false,
              thu: false,
              fri: false,
              sat: false,
              sun: false
            }
          };
          
          // Find time patterns (HH:MM format)
          const timePattern = /\d{2}:\d{2}/g;
          const times = cellTexts.join(' ').match(timePattern);
          
          if (times && times.length >= 2) {
            flight.departureTime = times[0];
            flight.arrivalTime = times[1];
          }
          
          // Check for airport codes (3 letter codes)
          const airportPattern = /\b[A-Z]{3}\b/g;
          const airports = cellTexts.join(' ').match(airportPattern);
          if (airports && airports.length > 0) {
            // First airport code after flight number is likely destination
            const flightNoIndex = cellTexts.findIndex(cell => cell === flight.flightNo);
            for (let j = flightNoIndex + 1; j < cellTexts.length; j++) {
              const match = cellTexts[j].match(airportPattern);
              if (match) {
                flight.destination = match[0];
                break;
              }
            }
          }
          
          // Look for destination with parentheses (e.g., "KIX(간사이)")
          for (const cell of cellTexts) {
            if (cell.includes('(') && cell.includes(')')) {
              flight.destination = cell;
              break;
            }
          }
          
          flights.push(flight);
        }
      }
      
      return flights;
    });
    
    return flightData;
    
  } catch (error) {
    console.error(`Error extracting data for ${departureCode}:`, error.message);
    return [];
  }
}

(async () => {
  console.log('Starting comprehensive flight schedule extraction...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const page = await browser.newPage();
  
  try {
    const koreanAirports = [
      { code: 'PUS', name: '김해공항' },  // Start with PUS for testing
      { code: 'ICN', name: '인천공항' },
      { code: 'GMP', name: '김포공항' },
      { code: 'CJU', name: '제주공항' },
      { code: 'TAE', name: '대구공항' }
    ];
    
    const allSchedules = {};
    
    for (const airport of koreanAirports) {
      const flights = await extractFlightSchedule(page, airport.code, airport.name);
      
      if (flights.length > 0) {
        // Find PUS to KIX flights
        const pusToKixFlights = flights.filter(f => 
          airport.code === 'PUS' && 
          (f.destination.includes('KIX') || f.destination.includes('간사이'))
        );
        
        if (pusToKixFlights.length > 0) {
          console.log(`\n🎯 Found ${pusToKixFlights.length} PUS to KIX flights:`);
          pusToKixFlights.forEach(f => {
            console.log(`  ${f.airline} ${f.flightNo} - Dep: ${f.departureTime}, Arr: ${f.arrivalTime}`);
          });
        }
        
        allSchedules[airport.code] = {
          airportName: airport.name,
          totalFlights: flights.length,
          flights: flights
        };
        
        // Save individual airport data
        const filename = `complete-schedule-${airport.code}.json`;
        fs.writeFileSync(
          path.join(__dirname, '..', 'downloads', filename),
          JSON.stringify({
            airport: airport,
            extractedAt: new Date().toISOString(),
            totalFlights: flights.length,
            flights: flights
          }, null, 2),
          'utf8'
        );
        
        console.log(`Saved ${flights.length} flights to downloads/${filename}`);
      }
      
      await page.waitForTimeout(2000);
    }
    
    // Save summary
    const summaryFile = 'flight-schedules-summary.json';
    fs.writeFileSync(
      path.join(__dirname, '..', 'downloads', summaryFile),
      JSON.stringify({
        extractedAt: new Date().toISOString(),
        totalAirports: Object.keys(allSchedules).length,
        airports: allSchedules
      }, null, 2),
      'utf8'
    );
    
    console.log(`\n=== EXTRACTION COMPLETE ===`);
    console.log(`Processed ${Object.keys(allSchedules).length} airports`);
    console.log(`Summary saved to downloads/${summaryFile}`);
    
    console.log('\nBrowser will remain open for verification.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();