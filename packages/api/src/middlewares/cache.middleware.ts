import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

// In-memory cache for development (use Redis in production)
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

/**
 * Cache middleware for API responses
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req: Request) => {
      const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`;
      return createHash('md5').update(key).digest('hex');
    },
    condition = () => true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition is not met
    if (!condition(req)) {
      return next();
    }

    // Skip caching for non-GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = keyGenerator(req);
    const now = Date.now();
    const cached = cache.get(cacheKey);

    // Return cached response if valid
    if (cached && (now - cached.timestamp) < (cached.ttl * 1000)) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('X-Cache-TTL', Math.round((cached.ttl * 1000 - (now - cached.timestamp)) / 1000));
      return res.json(cached.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          timestamp: now,
          ttl
        });
        res.setHeader('X-Cache-Status', 'MISS');
        res.setHeader('X-Cache-TTL', ttl);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache invalidation middleware
 */
export const invalidateCacheMiddleware = (patterns: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Clear cache after successful write operations
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (patterns.length === 0) {
          // Clear all cache if no patterns specified
          cache.clear();
        } else {
          // Clear cache matching patterns
          for (const [key] of cache) {
            for (const pattern of patterns) {
              if (key.includes(pattern)) {
                cache.delete(key);
                break;
              }
            }
          }
        }
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Cache cleanup job (removes expired entries)
 */
export const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of cache) {
    if (now - value.timestamp >= value.ttl * 1000) {
      cache.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

/**
 * Cache statistics
 */
export const getCacheStats = () => {
  const now = Date.now();
  const stats = {
    totalEntries: cache.size,
    expiredEntries: 0,
    validEntries: 0,
    memoryUsage: 0
  };

  for (const [, value] of cache) {
    if (now - value.timestamp >= value.ttl * 1000) {
      stats.expiredEntries++;
    } else {
      stats.validEntries++;
    }
    stats.memoryUsage += JSON.stringify(value).length;
  }

  return stats;
};

export default cacheMiddleware;