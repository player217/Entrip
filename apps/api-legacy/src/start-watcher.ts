import './index'; // Start main server
import { flightWatcher } from './services/flight-watcher';

// Start the flight watcher service
setTimeout(() => {
  console.log('[DelayWatcher] Starting flight delay monitoring service...');
  flightWatcher.start();
  
  // Add some test flights to watch
  const testFlights = ['KE001', 'OZ201', 'KE705', 'BX101'];
  testFlights.forEach(flight => {
    flightWatcher.addFlight(flight);
  });
  
  console.log(`[DelayWatcher] Monitoring ${testFlights.length} flights for delays`);
}, 2000); // Wait for server to fully start

// Keep process alive
process.on('SIGINT', () => {
  console.log('[DelayWatcher] Shutting down...');
  flightWatcher.stop();
  process.exit(0);
});