const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser to check flight schedule page...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the Entrip application
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded, waiting for content...');
    await page.waitForTimeout(3000);
    
    // Take screenshot of main page
    await page.screenshot({ path: 'entrip-main-page.png', fullPage: true });
    console.log('Main page screenshot saved as entrip-main-page.png');
    
    // Find and click the airplane icon in header
    console.log('Looking for airplane icon in header...');
    const airplaneIcon = await page.$('button[title="항공편 조회"]');
    
    if (airplaneIcon) {
      console.log('Found airplane icon, clicking...');
      await airplaneIcon.click();
      await page.waitForTimeout(3000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Take screenshot of flight schedule page
      await page.screenshot({ path: 'flight-schedule-page.png', fullPage: true });
      console.log('Flight schedule page screenshot saved as flight-schedule-page.png');
      
      // Check for departure airport selector
      const departureSelect = await page.$('select');
      if (departureSelect) {
        console.log('Found departure airport selector');
        
        // Get all options
        const options = await page.$$eval('select option', opts => 
          opts.map(opt => ({ value: opt.value, text: opt.textContent }))
        );
        console.log('Available departure airports:', options.slice(0, 5));
        
        // Select PUS (김해공항)
        await departureSelect.selectOption('PUS');
        console.log('Selected PUS as departure');
        await page.waitForTimeout(2000);
        
        // Check if arrival selector is enabled
        const arrivalSelect = await page.$('select:nth-of-type(2)');
        if (arrivalSelect) {
          const isDisabled = await arrivalSelect.evaluate(el => el.disabled);
          console.log('Arrival selector disabled?', isDisabled);
          
          if (!isDisabled) {
            // Get available destinations
            const destinations = await page.$$eval('select:nth-of-type(2) option', opts => 
              opts.map(opt => ({ value: opt.value, text: opt.textContent }))
            );
            console.log('Available destinations from PUS:', destinations);
            
            // Select KIX if available
            const kixOption = destinations.find(d => d.value === 'KIX');
            if (kixOption) {
              await arrivalSelect.selectOption('KIX');
              console.log('Selected KIX as arrival');
              await page.waitForTimeout(2000);
              
              // Take screenshot of results
              await page.screenshot({ path: 'pus-kix-flights.png', fullPage: true });
              console.log('PUS-KIX flights screenshot saved as pus-kix-flights.png');
              
              // Check for flight table
              const flightTable = await page.$('table');
              if (flightTable) {
                console.log('Flight table found!');
                
                // Get flight data
                const flights = await page.$$eval('table tbody tr', rows => 
                  rows.map(row => {
                    const cells = row.querySelectorAll('td');
                    return {
                      airline: cells[0]?.textContent?.trim(),
                      flightNo: cells[1]?.textContent?.trim(),
                      departure: cells[2]?.textContent?.trim(),
                      arrival: cells[3]?.textContent?.trim()
                    };
                  })
                );
                
                console.log('\nFlights found:');
                flights.forEach(flight => {
                  console.log(`  ${flight.airline} ${flight.flightNo}: ${flight.departure} → ${flight.arrival}`);
                });
              }
            }
          }
        }
      }
    } else {
      console.log('Airplane icon not found in header!');
    }
    
    console.log('\nBrowser will remain open for manual inspection.');
    console.log('Press Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Error screenshot saved');
  }
})();