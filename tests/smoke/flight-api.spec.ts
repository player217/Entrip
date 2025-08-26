import { test, expect } from '@playwright/test';

test.describe('Flight API Smoke Tests', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:4000';

  test('should return 200 for airports endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/flight/airports`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    
    console.log(`✅ Airports endpoint: ${response.status()} - ${data.length} airports`);
  });

  test('should return 200 for timetable endpoint with valid params', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/flight/timetable?dep=ICN&arr=GMP`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    
    console.log(`✅ Timetable endpoint: ${response.status()} - ${data.length} flights`);
  });

  test('should return valid status for flight endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/flight/status/KE001`);
    
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('flightNo');
      expect(data).toHaveProperty('status');
      console.log(`✅ Status endpoint: ${response.status()} - Flight ${data.flightNo} is ${data.status}`);
    } else {
      console.log(`✅ Status endpoint: ${response.status()} - Flight not found (expected)`);
    }
  });

  test('should return metrics endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/metrics`);
    
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/plain');
    
    const metrics = await response.text();
    expect(metrics).toContain('flight_requests_total');
    expect(metrics).toContain('flight_request_duration_seconds');
    
    console.log(`✅ Metrics endpoint: ${response.status()} - Prometheus metrics available`);
  });

  test('should handle rate limiting gracefully', async ({ request }) => {
    // Make multiple requests quickly
    const promises = Array.from({ length: 5 }, () => 
      request.get(`${baseURL}/api/flight/status/KE001`)
    );
    
    const responses = await Promise.all(promises);
    
    // At least one should succeed
    const successCount = responses.filter(r => r.status() === 200 || r.status() === 404).length;
    expect(successCount).toBeGreaterThan(0);
    
    // Check if any got rate limited
    const rateLimited = responses.filter(r => r.status() === 429).length;
    
    console.log(`✅ Rate limiting test: ${successCount} successful, ${rateLimited} rate limited`);
  });
});