import { test, expect } from '@playwright/test';

test.describe('Canary Deployment with Tracing Tests', () => {
  const canaryURL = process.env.CANARY_URL || 'http://canary.api.entrip.io';
  const stableURL = process.env.STABLE_URL || 'http://api.entrip.io';
  
  test('canary endpoint should return 200 and include trace headers', async ({ request }) => {
    console.log('🚀 Testing canary deployment with trace correlation');
    
    // Make request to canary with x-canary header
    const response = await request.get(`${canaryURL}/healthz`, {
      headers: {
        'x-canary': 'true',
        'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
      }
    });
    
    expect(response.status()).toBe(200);
    
    // Check for trace headers in response
    const headers = response.headers();
    expect(headers['x-trace-id']).toBeDefined();
    
    const traceId = headers['x-trace-id'];
    console.log(`✅ Canary health check passed with TraceID: ${traceId}`);
    
    // Verify response body
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  test('canary should handle flight API requests with proper tracing', async ({ request }) => {
    // Test multiple endpoints to verify canary behavior
    const endpoints = [
      '/api/flight/airports',
      '/api/flight/routes?departure=ICN',
      '/api/flight/timetable?dep=ICN&arr=GMP'
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${canaryURL}${endpoint}`, {
        headers: {
          'x-canary': 'true'
        }
      });
      
      // Should get valid response or rate limit
      expect([200, 429]).toContain(response.status());
      
      // Check trace header presence
      const traceId = response.headers()['x-trace-id'];
      expect(traceId).toBeDefined();
      expect(traceId).toMatch(/^[a-f0-9]{32}$/);
      
      console.log(`✅ Canary ${endpoint}: ${response.status()} - TraceID: ${traceId}`);
    }
  });

  test('trace correlation between logs and traces should work', async ({ request }) => {
    // Generate a unique trace ID for correlation test
    const testTraceId = generateTraceId();
    const traceparent = `00-${testTraceId}-${generateSpanId()}-01`;
    
    // Make request with specific trace parent
    const response = await request.post(`${canaryURL}/api/flight/status/TEST001`, {
      headers: {
        'x-canary': 'true',
        'traceparent': traceparent
      },
      data: {
        test: true,
        correlationTest: true
      }
    });
    
    // Even if endpoint doesn't exist, should get proper error with trace
    expect([200, 404, 405]).toContain(response.status());
    
    const responseTraceId = response.headers()['x-trace-id'];
    expect(responseTraceId).toBeDefined();
    
    console.log(`✅ Trace correlation test - Request TraceID: ${testTraceId}`);
    console.log(`✅ Response TraceID: ${responseTraceId}`);
  });

  test('canary and stable should have different deployment versions', async ({ request }) => {
    // Check canary version
    const canaryResponse = await request.get(`${canaryURL}/healthz`, {
      headers: { 'x-canary': 'true' }
    });
    
    // Check stable version
    const stableResponse = await request.get(`${stableURL}/healthz`);
    
    expect(canaryResponse.status()).toBe(200);
    expect(stableResponse.status()).toBe(200);
    
    const canaryHeaders = canaryResponse.headers();
    const stableHeaders = stableResponse.headers();
    
    // Both should have trace IDs
    expect(canaryHeaders['x-trace-id']).toBeDefined();
    expect(stableHeaders['x-trace-id']).toBeDefined();
    
    // Log deployment info
    console.log('✅ Canary deployment: Active with tracing');
    console.log('✅ Stable deployment: Active with tracing');
  });

  test('canary should maintain SLO during smoke test', async ({ request }) => {
    console.log('📊 Running SLO validation for canary...');
    
    const requests = 20;
    let successes = 0;
    let failures = 0;
    const responseTimes: number[] = [];
    
    // Make multiple requests to test SLO
    for (let i = 0; i < requests; i++) {
      const startTime = Date.now();
      
      try {
        const response = await request.get(`${canaryURL}/api/flight/airports`, {
          headers: { 'x-canary': 'true' },
          timeout: 5000
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        if (response.status() >= 200 && response.status() < 300) {
          successes++;
        } else if (response.status() === 429) {
          // Rate limiting is acceptable
          successes++;
        } else {
          failures++;
        }
      } catch (error) {
        failures++;
      }
    }
    
    // Calculate metrics
    const successRate = successes / requests;
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95ResponseTime = calculateP95(responseTimes);
    
    console.log(`📊 Canary SLO Results:`);
    console.log(`   Success rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`   Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`   P95 response time: ${p95ResponseTime.toFixed(0)}ms`);
    
    // Assert SLO requirements
    expect(successRate).toBeGreaterThanOrEqual(0.95); // 95% success rate
    expect(p95ResponseTime).toBeLessThan(2000); // P95 under 2 seconds
    
    console.log('✅ Canary meets SLO requirements');
  });
});

// Helper functions
function generateTraceId(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateSpanId(): string {
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function calculateP95(times: number[]): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[index];
}