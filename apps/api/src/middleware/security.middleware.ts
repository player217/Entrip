// D2.2: Comprehensive Security Middleware
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * D2.2: Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // XSS Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // IE No Open
  ieNoOpen: true,
  
  // Don't infer MIME type
  permittedCrossDomainPolicies: false
});

/**
 * D2.2: Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: '요청 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
    retryAfter: '15분'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    console.warn(`[D2.2] Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: '요청 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
      retryAfter: '15분'
    });
  }
});

/**
 * D2.2: Strict Authentication Rate Limiting
 * More aggressive rate limiting for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts to 10 per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
    retryAfter: '15분'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`[D2.2] Auth rate limit exceeded for IP: ${req.ip}, attempt: ${req.body?.username || 'unknown'}`);
    res.status(429).json({
      success: false,
      message: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.',
      retryAfter: '15분'
    });
  }
});

/**
 * D2.2: Request Size Limiting Middleware
 * Prevent large payload attacks
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength > maxSize) {
    console.warn(`[D2.2] Request size too large: ${contentLength} bytes from ${req.ip}`);
    return res.status(413).json({
      success: false,
      message: '요청 크기가 너무 큽니다. 최대 10MB까지 허용됩니다.'
    });
  }
  
  next();
};

/**
 * D2.2: IP Validation Middleware
 * Block requests from suspicious IPs
 */
export const ipValidation = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.connection.remoteAddress || '';
  
  // Block private network ranges in production (except local development)
  if (process.env.NODE_ENV === 'production') {
    const privateRanges = [
      /^10\./,          // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,    // 192.168.0.0/16
      /^127\./,         // 127.0.0.0/8 (loopback)
      /^169\.254\./,    // 169.254.0.0/16 (link-local)
      /^::1$/,          // IPv6 loopback
      /^fc00:/,         // IPv6 unique local
      /^fe80:/          // IPv6 link-local
    ];
    
    const isPrivate = privateRanges.some(range => range.test(clientIp));
    if (isPrivate && !clientIp.startsWith('192.168.')) {
      console.warn(`[D2.2] Blocked request from private IP in production: ${clientIp}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied from this network'
      });
    }
  }
  
  next();
};

/**
 * D2.2: Security Response Headers
 * Add additional security headers to responses
 */
export const securityResponseHeaders = (req: Request, res: Response, next: NextFunction) => {
  // API Version header
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  
  // Request ID from request
  const requestId = req.headers['x-request-id'] || 'unknown';
  res.setHeader('X-Request-ID', requestId);
  
  // Cache control for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};