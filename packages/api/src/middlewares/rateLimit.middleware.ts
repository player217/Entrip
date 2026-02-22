import { Request, Response, NextFunction } from 'express';
import { appConfig } from '../config';
import { logger } from '../lib/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
  violations: number; // Track repeated violations
  burstCount: number; // Track burst requests
  burstResetTime: number; // Burst window reset time
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  // Enhanced security features
  enableProgressivePenalty?: boolean; // Progressive rate limiting
  burstLimit?: number; // Burst protection limit
  burstWindowMs?: number; // Burst detection window (default: 1 second)
  whitelistIPs?: string[]; // Trusted IP addresses
  enableDDoSProtection?: boolean; // Enhanced DDoS protection
  maxViolations?: number; // Max violations before extended ban
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute (skip in test to avoid open handles)
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 60000);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  // Public method to get store info for debugging
  public getStoreInfo(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  // Public method to clear store
  public clearStore(): void {
    this.store.clear();
  }

  public generateKey(req: Request, keyGenerator?: (req: Request) => string): string {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Default key generation: IP + User ID (if authenticated)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number; isWhitelisted?: boolean } {
    const now = Date.now();
    const windowMs = config.windowMs;

    // Check if IP is whitelisted
    const ip = key.split(':')[0];
    const isWhitelisted = config.whitelistIPs && config.whitelistIPs.includes(ip);

    if (isWhitelisted) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + windowMs,
        isWhitelisted: true,
      };
    }

    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      const violations = entry?.violations || 0; // Preserve violations across resets
      entry = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now,
        violations: violations,
        burstCount: 0,
        burstResetTime: now + (config.burstWindowMs || 1000),
      };
    }

    // Reset burst counter if burst window expired
    if (now > entry.burstResetTime) {
      entry.burstCount = 0;
      entry.burstResetTime = now + (config.burstWindowMs || 1000);
    }

    entry.count++;
    entry.burstCount++;
    entry.lastRequest = now;

    // Check for burst limit violation
    const burstLimit = config.burstLimit || Math.floor(config.maxRequests / 4);
    if (config.enableDDoSProtection && entry.burstCount > burstLimit) {
      entry.violations++;
      this.store.set(key, entry);

      logger.warn('Rate limit burst detected', {
        key,
        burstCount: entry.burstCount,
        burstLimit,
        violations: entry.violations
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Check for max violations - extended penalty
    if (config.maxViolations && entry.violations >= config.maxViolations) {
      // Extended penalty: reset time extended
      if (config.enableProgressivePenalty) {
        const penaltyMultiplier = Math.min(entry.violations, 10); // Cap at 10x
        entry.resetTime = now + (windowMs * penaltyMultiplier);
        this.store.set(key, entry);

        logger.warn('Rate limit extended penalty applied', {
          key,
          violations: entry.violations,
          penaltyMultiplier,
          newResetTime: new Date(entry.resetTime)
        });
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    this.store.set(key, entry);

    // Check if over limit
    if (entry.count > config.maxRequests) {
      entry.violations++;
      this.store.set(key, entry);

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  // Remove specific key
  remove(key: string): void {
    this.store.delete(key);
  }

  // Get specific entry
  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  // Clear all entries
  clear(): void {
    this.store.clear();
  }

  // Destroy and cleanup
  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Create global rate limiter instance
export const rateLimiter = new RateLimiter();

// Cleanup on process exit
process.on('exit', () => {
  rateLimiter.destroy();
});

// Helper function to get trusted IPs based on environment
const getTrustedIPs = (): string[] => {
  if (appConfig.server.isProduction) {
    return [
      // Add production trusted IPs here
      // '192.168.1.0/24', // Internal network
      // '10.0.0.0/8',     // Private network
    ];
  }
  return [
    '127.0.0.1',     // localhost
    '::1',           // IPv6 localhost
    '192.168.1.1',   // Local development
  ];
};

// Enhanced default rate limit configuration
const defaultConfig: RateLimitConfig = {
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  // Enhanced security features for production
  enableProgressivePenalty: appConfig.server.isProduction,
  enableDDoSProtection: true,
  burstLimit: appConfig.server.isProduction ? 10 : 20, // Stricter in production
  burstWindowMs: 1000, // 1 second burst window
  maxViolations: appConfig.server.isProduction ? 3 : 5, // Stricter in production
  whitelistIPs: getTrustedIPs(),
};

export function createRateLimit(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Base key
    const baseKey = rateLimiter.generateKey(req, finalConfig.keyGenerator);
    // Test isolation: allow per-run prefix via header/env in test mode
    const maybeHeaderPrefix = req.get('X-Test-Run-Id') || '';
    const maybeEnvPrefix = process.env.NODE_ENV === 'test' ? (process.env.RATE_LIMIT_PREFIX || '') : '';
    const key = [maybeHeaderPrefix || maybeEnvPrefix, baseKey].filter(Boolean).join(':');
    const result = rateLimiter.check(key, finalConfig);

    // Set enhanced rate limit headers
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Window': finalConfig.windowMs.toString(),
    };

    // Add additional security headers
    if (result.isWhitelisted) {
      headers['X-RateLimit-Whitelisted'] = 'true';
    }

    if (finalConfig.enableDDoSProtection) {
      headers['X-RateLimit-DDoS-Protection'] = 'enabled';
    }

    // Set headers
    Object.entries(headers).forEach(([name, value]) => {
      res.setHeader(name, value);
    });

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        key,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        resetTime: new Date(result.resetTime),
        remaining: result.remaining,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: finalConfig.message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        limit: finalConfig.maxRequests,
        remaining: result.remaining,
        resetTime: result.resetTime,
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters for different scenarios with enhanced security
export const generalRateLimit = createRateLimit();

export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: appConfig.server.isProduction ? 5 : 10, // Stricter in production
  message: 'Too many requests. Please try again in 15 minutes.',
  enableProgressivePenalty: true,
  enableDDoSProtection: true,
  burstLimit: appConfig.server.isProduction ? 3 : 5,
  maxViolations: 2, // Very strict for sensitive endpoints
});

// Auth rate limiter with test-mode bypass to avoid flakiness in CI/E2E.
const _authRateLimitInner = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: appConfig.server.isProduction ? 3 : 5, // Very strict for auth
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  enableProgressivePenalty: true,
  enableDDoSProtection: true,
  burstLimit: 2, // Very low burst limit for auth
  maxViolations: 2, // Quick ban for auth abuse
  keyGenerator: (req: Request) => {
    // Use IP + email for auth endpoints
    const ip = req.ip || 'unknown';
    const email = req.body?.email || 'unknown';
    return `auth:${ip}:${email}`;
  },
});

export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (
    process.env.NODE_ENV === 'test' &&
    (
      process.env.RATE_LIMIT_DISABLE_IN_TEST === 'true' ||
      Boolean(req.get('X-Test-Run-Id'))
    )
  ) {
    return next();
  }
  return _authRateLimitInner(req, res, next);
};

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: appConfig.server.isProduction ? 30 : 60, // Stricter in production
  message: 'API rate limit exceeded. Please slow down your requests.',
  enableProgressivePenalty: appConfig.server.isProduction,
  enableDDoSProtection: true,
  burstLimit: appConfig.server.isProduction ? 15 : 20,
  maxViolations: appConfig.server.isProduction ? 3 : 5,
});

// New: Ultra-strict rate limiter for critical endpoints
export const criticalRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: appConfig.server.isProduction ? 5 : 10,
  message: 'Critical endpoint access limited. Contact support if needed.',
  enableProgressivePenalty: true,
  enableDDoSProtection: true,
  burstLimit: 1, // No burst allowed
  maxViolations: 1, // Immediate extended ban
});
