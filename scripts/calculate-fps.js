#!/usr/bin/env node
/**
 * Calculate FPS from Lighthouse trace.json
 * Based on Chrome DevTools FPS calculation methodology
 */

const fs = require('fs');
const path = require('path');

function calculateFPSFromTrace(tracePath) {
  const traceData = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  const events = traceData.traceEvents || [];
  
  // Find main thread
  const mainThreadEvents = events.filter(e => 
    e.cat && e.cat.includes('devtools.timeline') && 
    e.name === 'ThreadName' && 
    e.args && e.args.name === 'CrRendererMain'
  );
  
  if (mainThreadEvents.length === 0) {
    console.error('Could not find main thread in trace');
    return;
  }
  
  const mainPid = mainThreadEvents[0].pid;
  const mainTid = mainThreadEvents[0].tid;
  
  // Get frame events
  const frameEvents = events.filter(e => 
    e.pid === mainPid && 
    e.name === 'DrawFrame'
  );
  
  if (frameEvents.length < 2) {
    console.error('Not enough frame events to calculate FPS');
    return;
  }
  
  // Calculate frame intervals
  const frameIntervals = [];
  for (let i = 1; i < frameEvents.length; i++) {
    const interval = (frameEvents[i].ts - frameEvents[i-1].ts) / 1000; // Convert to ms
    frameIntervals.push(interval);
  }
  
  // Filter out outliers (> 100ms = < 10 FPS)
  const validIntervals = frameIntervals.filter(interval => interval < 100);
  
  if (validIntervals.length === 0) {
    console.error('No valid frame intervals found');
    return;
  }
  
  // Calculate statistics
  const avgInterval = validIntervals.reduce((a, b) => a + b) / validIntervals.length;
  const avgFPS = 1000 / avgInterval;
  
  // Count dropped frames (> 16.67ms for 60fps)
  const droppedFrames = validIntervals.filter(interval => interval > 16.67).length;
  const smoothFrames = validIntervals.filter(interval => interval <= 16.67).length;
  
  // Calculate percentiles
  const sorted = [...validIntervals].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95FPS = 1000 / sorted[p95Index];
  
  console.log('=== FPS Analysis Results ===');
  console.log(`Total frames analyzed: ${frameEvents.length}`);
  console.log(`Valid frame intervals: ${validIntervals.length}`);
  console.log(`Average FPS: ${avgFPS.toFixed(1)}`);
  console.log(`P95 FPS: ${p95FPS.toFixed(1)}`);
  console.log(`Smooth frames (60+ FPS): ${smoothFrames} (${(smoothFrames/validIntervals.length*100).toFixed(1)}%)`);
  console.log(`Dropped frames: ${droppedFrames} (${(droppedFrames/validIntervals.length*100).toFixed(1)}%)`);
  
  // Mobile performance rating
  let rating = 'Poor';
  if (avgFPS >= 60) rating = 'Excellent';
  else if (avgFPS >= 50) rating = 'Good';
  else if (avgFPS >= 30) rating = 'Fair';
  
  console.log(`\nMobile Performance Rating: ${rating}`);
  
  // Return for programmatic use
  return {
    totalFrames: frameEvents.length,
    avgFPS: avgFPS.toFixed(1),
    p95FPS: p95FPS.toFixed(1),
    smoothFramesPercent: (smoothFrames/validIntervals.length*100).toFixed(1),
    rating
  };
}

// Run if called directly
if (require.main === module) {
  const tracePath = process.argv[2];
  if (!tracePath) {
    console.error('Usage: node calculate-fps.js <trace.json>');
    process.exit(1);
  }
  
  calculateFPSFromTrace(tracePath);
}

module.exports = { calculateFPSFromTrace };