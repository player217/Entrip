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
    
    // Try different selectors for the airplane icon
    const selectors = [
      'button[title="항공편 조회"]',
      '[title="항공편 조회"]',
      'button:has(svg[class*="airplane"])',
      'button:has([data-icon*="airplane"])',
      // Look for the icon in the header area
      'header button:nth-of-type(2)', // Second button in header icons
    ];
    
    let airplaneButton = null;
    for (const selector of selectors) {
      console.log(`Trying selector: ${selector}`);
      const element = await page.$(selector);
      if (element) {
        airplaneButton = element;
        console.log(`Found with selector: ${selector}`);
        break;
      }
    }
    
    // If still not found, try to find by visual inspection
    if (!airplaneButton) {
      console.log('Trying to find airplane icon by position...');
      // Get all buttons in the header right section
      const headerButtons = await page.$$('header div[class*="right"] button');
      console.log(`Found ${headerButtons.length} buttons in header right section`);
      
      // The airplane icon should be the second button (after map)
      if (headerButtons.length >= 2) {
        airplaneButton = headerButtons[1];
        console.log('Using second button in header as airplane icon');
      }
    }
    
    if (airplaneButton) {
      console.log('Clicking airplane icon...');
      await airplaneButton.click();
      await page.waitForTimeout(3000);
      
      // Check current URL
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Take screenshot
      await page.screenshot({ path: 'after-airplane-click.png', fullPage: true });
      console.log('Screenshot saved as after-airplane-click.png');
      
      // Check if we're on the flight schedule page
      if (currentUrl.includes('flight-schedule')) {
        console.log('Successfully navigated to flight schedule page!');
        
        // Check page content
        const pageTitle = await page.$('h1');
        if (pageTitle) {
          const titleText = await pageTitle.textContent();
          console.log('Page title:', titleText);
        }
        
        // Check for selectors
        const selects = await page.$$('select');
        console.log(`Found ${selects.length} select elements`);
        
        if (selects.length >= 2) {
          // Select PUS as departure
          console.log('Selecting PUS as departure...');
          await selects[0].selectOption('PUS');
          await page.waitForTimeout(2000);
          
          // Check available destinations
          const destinations = await selects[1].$$eval('option', opts => 
            opts.map(opt => ({ value: opt.value, text: opt.textContent?.trim() }))
          );
          console.log('Available destinations:', destinations);
          
          // Select KIX if available
          if (destinations.some(d => d.value === 'KIX')) {
            console.log('Selecting KIX as destination...');
            await selects[1].selectOption('KIX');
            await page.waitForTimeout(2000);
            
            // Take final screenshot
            await page.screenshot({ path: 'pus-kix-schedule.png', fullPage: true });
            console.log('PUS-KIX schedule screenshot saved');
            
            // Check for flight table
            const table = await page.$('table');
            if (table) {
              console.log('Flight schedule table found!');
              
              // Get flight details
              const flights = await page.$$eval('table tbody tr', rows => 
                rows.map(row => {
                  const cells = row.querySelectorAll('td');
                  return Array.from(cells).slice(0, 4).map(cell => cell.textContent?.trim());
                })
              );
              
              console.log('\nFlight Schedule:');
              flights.forEach(flight => {
                console.log(`  ${flight.join(' | ')}`);
              });
            }
          }
        }
      }
    } else {
      console.log('Could not find airplane icon button!');
      
      // List all buttons in header for debugging
      const allButtons = await page.$$eval('header button', buttons => 
        buttons.map((btn, i) => ({
          index: i,
          title: btn.getAttribute('title'),
          text: btn.textContent?.trim(),
          className: btn.className
        }))
      );
      console.log('\nAll header buttons:', allButtons);
    }
    
    console.log('\nBrowser will remain open for manual inspection.');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
  }
})();