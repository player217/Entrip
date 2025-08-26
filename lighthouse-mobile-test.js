const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const options = {
    logLevel: 'info',
    output: ['json', 'html'],
    onlyCategories: ['performance'],
    port: chrome.port,
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      disabled: false,
    },
  };
  
  const runnerResult = await lighthouse('http://localhost:3000/calendar', options);
  
  // Extract and save results
  const reportJson = runnerResult.report[0];
  const reportHtml = runnerResult.report[1];
  
  fs.writeFileSync('docs/artifacts/lighthouse-mobile.json', reportJson);
  fs.writeFileSync('docs/artifacts/lighthouse-mobile.html', reportHtml);
  
  const result = JSON.parse(reportJson);
  console.log('Performance Score:', result.categories.performance.score * 100);
  
  // Extract key metrics
  const metrics = result.audits.metrics.details.items[0];
  console.log('First Contentful Paint:', metrics.firstContentfulPaint, 'ms');
  console.log('Time to Interactive:', metrics.interactive, 'ms');
  console.log('Speed Index:', metrics.speedIndex, 'ms');
  console.log('Total Blocking Time:', metrics.totalBlockingTime, 'ms');
  console.log('Cumulative Layout Shift:', metrics.cumulativeLayoutShift);
  
  await chrome.kill();
  
  // Run FPS calculation on the trace
  if (result.audits['main-thread-tasks'] && result.audits['main-thread-tasks'].details) {
    const mainThreadTasks = result.audits['main-thread-tasks'].details;
    console.log('\nMain thread task analysis:');
    console.log('Total tasks:', mainThreadTasks.items.length);
  }
}

runLighthouse().catch(console.error);