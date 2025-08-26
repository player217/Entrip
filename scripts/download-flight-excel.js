const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Launching browser to download flight data Excel...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    downloadsPath: path.join(__dirname, '..', 'downloads')
  });
  
  const context = await browser.newContext({
    acceptDownloads: true
  });
  const page = await context.newPage();
  
  try {
    await page.goto('https://www.airportal.go.kr/airport/aircraftInfo.do', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Page loaded successfully');
    await page.waitForTimeout(3000);
    
    // Look for Excel download button in the current view
    console.log('Looking for Excel download button...');
    
    // Try multiple selectors for Excel download
    const excelSelectors = [
      'button:has-text("엑셀")',
      'a:has-text("엑셀")',
      'button[title*="엑셀"]',
      'a[title*="엑셀"]',
      '[onclick*="excel"]',
      '[onclick*="Excel"]',
      'img[alt*="엑셀"]',
      'img[alt*="Excel"]'
    ];
    
    let downloadButton = null;
    for (const selector of excelSelectors) {
      const button = await page.$(selector);
      if (button) {
        downloadButton = button;
        console.log(`Found Excel button with selector: ${selector}`);
        break;
      }
    }
    
    if (downloadButton) {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      
      console.log('Clicking Excel download button...');
      await downloadButton.click();
      
      try {
        const download = await downloadPromise;
        const suggestedFilename = download.suggestedFilename();
        const downloadPath = path.join(__dirname, '..', 'downloads', suggestedFilename);
        
        console.log(`Downloading: ${suggestedFilename}`);
        await download.saveAs(downloadPath);
        console.log(`Successfully saved to: ${downloadPath}`);
        
        // Read the downloaded file info
        const fs = require('fs');
        const stats = fs.statSync(downloadPath);
        console.log(`File size: ${stats.size} bytes`);
        console.log(`File saved at: ${new Date().toLocaleString()}`);
        
      } catch (downloadError) {
        console.error('Download error:', downloadError.message);
        console.log('The Excel file might have opened in a new window or popup');
      }
    } else {
      console.log('Excel download button not found in current view');
      console.log('You may need to:');
      console.log('1. Select a specific airport (김해공항)');
      console.log('2. Choose departure/arrival tab');
      console.log('3. Set date/time filters');
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: 'excel-download-attempt.png', fullPage: true });
    console.log('Screenshot saved as excel-download-attempt.png');
    
    console.log('\nBrowser will remain open for manual download if needed.');
    console.log('Press Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
})();