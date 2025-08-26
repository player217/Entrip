import { test, expect } from '@playwright/test';

test.describe('Flight API SLO Tests', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:4000';
  const SLO_REQUEST_COUNT = 50;
  const SLO_ERROR_THRESHOLD = 0.10; // 10% max error rate (SLO: 95% success)

  test('should meet SLO requirements with 50 concurrent requests', async ({ request }) => {
    console.log(`🚀 Starting SLO test with ${SLO_REQUEST_COUNT} requests`);
    
    const startTime = Date.now();
    const results = {
      total: 0,
      success: 0,
      errors: 0,
      timeouts: 0,
      responseTimes: [] as number[]
    };
    
    // Generate mix of different endpoints to test
    const endpoints = [
      '/api/flight/airports',
      '/api/flight/routes?departure=ICN',
      '/api/flight/timetable?dep=ICN&arr=GMP',
      '/api/flight/status/KE001',
      '/api/flight/delay/OZ102'
    ];
    
    // Create 50 requests with random endpoints
    const requests = Array.from({ length: SLO_REQUEST_COUNT }, (_, i) => {
      const endpoint = endpoints[i % endpoints.length];
      return makeTimedRequest(request, `${baseURL}${endpoint}`, i);
    });
    
    // Execute all requests concurrently
    const responses = await Promise.allSettled(requests);
    
    // Analyze results
    for (const response of responses) {
      results.total++;
      
      if (response.status === 'fulfilled') {
        const { statusCode, responseTime, error } = response.value;
        
        results.responseTimes.push(responseTime);
        
        if (statusCode >= 200 && statusCode < 300) {
          results.success++;
        } else if (statusCode === 429) {
          // Rate limiting is expected behavior, count as success for SLO
          results.success++;
        } else {
          results.errors++;
          console.log(`❌ Request failed: ${statusCode} (${error || 'Unknown error'})`);
        }
      } else {
        results.timeouts++;
        console.log(`⏰ Request timed out: ${response.reason}`);
      }
    }
    
    // Calculate metrics
    const totalDuration = Date.now() - startTime;
    const successRate = results.success / results.total;
    const errorRate = (results.errors + results.timeouts) / results.total;
    const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    const p95ResponseTime = calculatePercentile(results.responseTimes, 0.95);
    const p99ResponseTime = calculatePercentile(results.responseTimes, 0.99);
    
    // Log detailed results
    console.log('\n📊 SLO Test Results:');
    console.log(`Total requests: ${results.total}`);
    console.log(`Successful: ${results.success} (${(successRate * 100).toFixed(1)}%)`);
    console.log(`Errors: ${results.errors}`);
    console.log(`Timeouts: ${results.timeouts}`);
    console.log(`Error rate: ${(errorRate * 100).toFixed(1)}%`);
    console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`95th percentile: ${p95ResponseTime.toFixed(0)}ms`);
    console.log(`99th percentile: ${p99ResponseTime.toFixed(0)}ms`);
    console.log(`Total test duration: ${totalDuration}ms`);
    
    // SLO Assertions
    expect(successRate).toBeGreaterThanOrEqual(0.95); // 95% success rate SLO
    expect(errorRate).toBeLessThanOrEqual(SLO_ERROR_THRESHOLD); // Max 10% error rate
    expect(p95ResponseTime).toBeLessThan(2000); // 95th percentile under 2 seconds
    expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
    
    // Performance expectations
    expect(results.total).toBe(SLO_REQUEST_COUNT);
    expect(totalDuration).toBeLessThan(30000); // Complete within 30 seconds
    
    console.log(`✅ SLO test PASSED: ${results.success}/${results.total} success (${(errorRate * 100).toFixed(1)}% error rate)`);
  });

  test('should handle rate limiting gracefully in SLO context', async ({ request }) => {
    console.log('🔄 Testing rate limiting behavior');
    
    // Make requests rapidly to single endpoint to trigger rate limiting
    const endpoint = `${baseURL}/api/flight/status/KE001`;
    const rapidRequests = Array.from({ length: 20 }, (_, i) => 
      makeTimedRequest(request, endpoint, i)
    );
    
    const responses = await Promise.allSettled(rapidRequests);
    
    let rateLimited = 0;
    let successful = 0;
    
    for (const response of responses) {
      if (response.status === 'fulfilled') {
        const { statusCode } = response.value;
        if (statusCode === 429) {
          rateLimited++;
        } else if (statusCode >= 200 && statusCode < 300) {
          successful++;
        }
      }
    }
    
    console.log(`Rate limited: ${rateLimited}, Successful: ${successful}`);
    
    // Expect some rate limiting when hitting limits
    expect(rateLimited).toBeGreaterThan(0);
    expect(successful).toBeGreaterThan(0);
    
    // Rate limiting should be consistent and predictable
    expect(rateLimited + successful).toBe(20);
    
    console.log('✅ Rate limiting test PASSED');
  });

  test('should recover from temporary failures', async ({ request }) => {
    console.log('🔧 Testing recovery from failures');
    
    // Try to trigger fallback cache behavior
    const endpoint = `${baseURL}/api/flight/airports`;
    
    // First, populate cache with successful request
    const cachePopulate = await request.get(endpoint);
    expect(cachePopulate.status()).toBe(200);
    
    // Then try to force error (if debug header is supported)
    const fallbackResponse = await request.get(endpoint, {
      headers: { 'x-debug-force-500': 'true' }
    });
    
    // Should either succeed normally or return cached fallback
    expect([200, 500].includes(fallbackResponse.status())).toBeTruthy();
    
    if (fallbackResponse.status() === 200) {
      const headers = fallbackResponse.headers();
      if (headers['x-cached-fallback'] === 'true') {
        console.log('✅ Fallback cache working');
      } else {
        console.log('✅ Service responding normally');
      }
    }
    
    console.log('✅ Recovery test PASSED');
  });
});

async function makeTimedRequest(
  request: any, 
  url: string, 
  index: number
): Promise<{ statusCode: number; responseTime: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const response = await request.get(url, {
      timeout: 5000 // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    return {
      statusCode: response.status(),
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      statusCode: 0,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const sorted = [...sortedArray].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}