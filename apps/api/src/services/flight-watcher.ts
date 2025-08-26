import { io } from '../ws';
import axios from 'axios';

interface DelayInfo {
  flightNo: string;
  airline: string;
  delay: number;
  status: string;
  departure: string;
  arrival: string;
}

class FlightWatcher {
  private watchedFlights: Set<string> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    console.log('[FlightWatcher] Initialized');
  }
  
  start() {
    if (this.checkInterval) return;
    
    console.log('[FlightWatcher] Starting delay monitoring (every 60s)');
    
    // Check every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkDelays();
    }, 60 * 1000);
    
    // Initial check
    this.checkDelays();
  }
  
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[FlightWatcher] Stopped delay monitoring');
    }
  }
  
  addFlight(flightNo: string) {
    this.watchedFlights.add(flightNo);
    console.log(`[FlightWatcher] Added ${flightNo} to watch list`);
  }
  
  removeFlight(flightNo: string) {
    this.watchedFlights.delete(flightNo);
    console.log(`[FlightWatcher] Removed ${flightNo} from watch list`);
  }
  
  private async checkDelays() {
    console.log(`[FlightWatcher] Checking ${this.watchedFlights.size} flights for delays`);
    
    const promises = Array.from(this.watchedFlights).map(async (flightNo) => {
      try {
        const response = await axios.get(`http://localhost:4000/api/flight/status/${flightNo}`);
        const data = response.data;
        
        // Check if delayed by 15+ minutes
        if (data.delay && data.delay >= 15) {
          const delayInfo: DelayInfo = {
            flightNo: data.flightNo,
            airline: flightNo.slice(0, 2),
            delay: data.delay,
            status: data.status,
            departure: data.departure || '',
            arrival: data.arrival || ''
          };
          
          console.log(`[FlightWatcher] Delay detected: ${flightNo} - ${data.delay} minutes`);
          
          // Emit WebSocket event
          io.emit('delay', delayInfo);
          console.log(`[WS] emit delay ${flightNo} ${data.delay}min`);
        }
      } catch (error) {
        console.error(`[FlightWatcher] Error checking ${flightNo}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
}

export const flightWatcher = new FlightWatcher();