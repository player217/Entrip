import rateLimit from 'express-rate-limit';
import { Counter } from 'prom-client';

// Rate limit counter metric
const rateLimitCounter = new Counter({
  name: 'flight_429_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['endpoint', 'ip']
});

export const flightRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: any, res: any) => {
    // Extract endpoint from path
    const endpoint = req.path?.replace('/api/flight/', '').split('/')[0] || 'unknown';
    
    // Increment rate limit counter
    rateLimitCounter.inc({
      endpoint,
      ip: req.ip || 'unknown'
    });
    
    console.log(`[RateLimit] Exceeded for ${req.ip} on ${endpoint}`);
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: 60,
      endpoint
    });
  }
});

export { rateLimitCounter };