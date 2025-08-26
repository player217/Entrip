import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';

test.describe('WebSocket Booking Event Capture', () => {
  test('capture WebSocket frames for booking creation', async ({ page, request }) => {
    // Enable WebSocket frame logging
    const wsFrames: any[] = [];
    
    page.on('websocket', ws => {
      console.log(`WebSocket opened: ${ws.url()}`);
      
      ws.on('framesent', event => {
        console.log(`>> Frame sent: ${event.payload}`);
        wsFrames.push({
          type: 'sent',
          payload: event.payload,
          timestamp: new Date().toISOString()
        });
      });
      
      ws.on('framereceived', event => {
        console.log(`<< Frame received: ${event.payload}`);
        wsFrames.push({
          type: 'received', 
          payload: event.payload,
          timestamp: new Date().toISOString()
        });
      });
      
      ws.on('close', () => {
        console.log('WebSocket closed');
      });
    });

    // Navigate to the calendar page (assuming WebSocket connects here)
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);

    // Create a booking via API to trigger WebSocket event
    const response = await request.post('http://localhost:4000/api/v1/bookings', {
      headers: {
        'Authorization': `Bearer ${process.env.JWT_TOKEN || fs.readFileSync('jwt-token.txt', 'utf-8').split('\n')[0]}`,
        'Content-Type': 'application/json'
      },
      data: {
        customerName: "WebSocket Test Customer",
        departureDate: "2025-02-01T09:00:00Z",
        returnDate: "2025-02-05T18:00:00Z", 
        destination: "OSA",
        flightNumber: "KE721",
        hotelName: "오사카 웨스틴",
        numberOfPeople: 3,
        status: "confirmed",
        totalPrice: 2500000
      }
    });

    expect(response.status()).toBe(201);
    const booking = await response.json();
    
    // Wait for WebSocket event
    await page.waitForTimeout(1000);
    
    // Save WebSocket frames
    await fs.writeFile(
      'docs/artifacts/ws-frames-capture.json',
      JSON.stringify({
        captureDate: new Date().toISOString(),
        bookingId: booking.id,
        frames: wsFrames
      }, null, 2)
    );
    
    // Verify WebSocket event was received
    const bookingEventFrame = wsFrames.find(frame => 
      frame.type === 'received' && 
      frame.payload.includes('booking:create')
    );
    
    expect(bookingEventFrame).toBeTruthy();
    console.log(`✅ WebSocket booking:create event captured for booking ${booking.id}`);
  });
});