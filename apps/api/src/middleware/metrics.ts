import { Request, Response, NextFunction } from 'express';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { rateLimitCounter } from './rate-limit';

// Metrics
const flightRequestsTotal = new Counter({
  name: 'flight_requests_total',
  help: 'Total number of requests to flight API endpoints',
  labelNames: ['endpoint', 'method', 'status']
});

const flightRequestDuration = new Histogram({
  name: 'flight_request_duration_seconds',
  help: 'Duration of flight API requests in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const flightApiAvailability = new Gauge({
  name: 'flight_api_availability',
  help: 'Availability of external flight APIs (1=up, 0=down)',
  labelNames: ['api_name']
});

const flightCacheHits = new Counter({
  name: 'flight_cache_hits_total',
  help: 'Total number of cache hits for flight API',
  labelNames: ['endpoint']
});

const flightCacheMisses = new Counter({
  name: 'flight_cache_misses_total',
  help: 'Total number of cache misses for flight API',
  labelNames: ['endpoint']
});

const flightRateLimitExceeded = new Counter({
  name: 'flight_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'api_name']
});

// Register metrics
register.registerMetric(flightRequestsTotal);
register.registerMetric(flightRequestDuration);
register.registerMetric(flightApiAvailability);
register.registerMetric(flightCacheHits);
register.registerMetric(flightCacheMisses);
register.registerMetric(flightRateLimitExceeded);
register.registerMetric(rateLimitCounter);

// Middleware to track metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only track flight API endpoints
  if (!req.path.startsWith('/api/flight')) {
    return next();
  }
  
  const endpoint = req.path.replace('/api/flight/', '').split('/')[0];
  const timer = flightRequestDuration.startTimer({ endpoint, method: req.method });
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    // Record metrics
    flightRequestsTotal.inc({ 
      endpoint, 
      method: req.method, 
      status: res.statusCode.toString() 
    });
    timer();
    
    // Call original end
    return originalEnd.apply(res, args as any);
  };
  
  next();
};

// Update API availability
export const updateApiAvailability = (apiName: string, isUp: boolean) => {
  flightApiAvailability.set({ api_name: apiName }, isUp ? 1 : 0);
};

// Track cache events
export const trackCacheHit = (endpoint: string) => {
  flightCacheHits.inc({ endpoint });
  console.log(`[Metrics] Cache hit for ${endpoint}`);
};

export const trackCacheMiss = (endpoint: string) => {
  flightCacheMisses.inc({ endpoint });
  console.log(`[Metrics] Cache miss for ${endpoint}`);
};

// Track rate limit events
export const trackRateLimit = (endpoint: string, apiName: string) => {
  flightRateLimitExceeded.inc({ endpoint, api_name: apiName });
  console.log(`[Metrics] Rate limit exceeded for ${endpoint} on ${apiName}`);
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
};