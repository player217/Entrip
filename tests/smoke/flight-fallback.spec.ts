import { test, expect } from '@playwright/test';

test.describe('Flight API Fallback Tests', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:4000';

  test('should return cached fallback when API fails', async ({ request }) => {
    // First make a successful request to populate cache
    const successResponse = await request.get(`${baseURL}/api/flight/airports`);
    expect(successResponse.status()).toBe(200);
    
    console.log('✅ Initial request successful - cache populated');
    
    // Force a 500 error using debug header
    const fallbackResponse = await request.get(`${baseURL}/api/flight/airports`, {
      headers: {
        'x-debug-force-500': 'true'
      }
    });
    
    // Should get 200 with fallback data
    expect(fallbackResponse.status()).toBe(200);
    
    // Check for fallback headers
    const headers = fallbackResponse.headers();
    expect(headers['x-cached-fallback']).toBe('true');
    expect(headers['x-cache-age']).toBeDefined();
    
    const data = await fallbackResponse.json();
    expect(Array.isArray(data)).toBeTruthy();
    
    console.log(`✅ Fallback test: Status ${fallbackResponse.status()}, X-Cached-Fallback: ${headers['x-cached-fallback']}, Cache age: ${headers['x-cache-age']}s`);
  });

  test('should handle rate limiting gracefully', async ({ request }) => {
    // Make multiple requests rapidly to trigger rate limit
    const promises = Array.from({ length: 15 }, () => 
      request.get(`${baseURL}/api/flight/status/KE001`)
    );
    
    const responses = await Promise.all(promises);
    
    // Check for 429 responses
    const rateLimitedCount = responses.filter(r => r.status() === 429).length;
    const successCount = responses.filter(r => r.status() === 200 || r.status() === 404).length;
    
    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(successCount).toBeGreaterThan(0);
    
    // Verify rate limit response format
    const rateLimitedResponse = responses.find(r => r.status() === 429);
    if (rateLimitedResponse) {
      const errorData = await rateLimitedResponse.json();
      expect(errorData.error).toBe('Too many requests');
      expect(errorData.retryAfter).toBe(60);
      expect(errorData.endpoint).toBeDefined();
    }
    
    console.log(`✅ Rate limit test: ${rateLimitedCount} rate limited, ${successCount} successful`);
  });

  test('should expose metrics endpoint for monitoring', async ({ request }) => {
    const response = await request.get(`${baseURL}/metrics`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    
    const metrics = await response.text();
    
    // Check for required metrics
    expect(metrics).toContain('flight_requests_total');
    expect(metrics).toContain('flight_request_duration_seconds');
    expect(metrics).toContain('flight_429_total');
    expect(metrics).toContain('flight_cache_hits_total');
    
    console.log('✅ Metrics endpoint: All required metrics present');
  });
});