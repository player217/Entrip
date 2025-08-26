import { Request, Response, NextFunction } from 'express';
import { trackCacheHit, trackCacheMiss } from './metrics';

interface CacheEntry {
  data: any;
  timestamp: number;
  statusCode: number;
}

class FallbackCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in ms
  
  set(key: string, data: any, statusCode: number = 200): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      statusCode
    });
    console.log(`[FallbackCache] Cached response for ${key}`);
  }
  
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(key);
      console.log(`[FallbackCache] Expired cache for ${key} (age: ${Math.round(age/1000/60)}min)`);
      return null;
    }
    
    console.log(`[FallbackCache] Cache hit for ${key} (age: ${Math.round(age/1000/60)}min)`);
    return entry;
  }
  
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  clear(): void {
    this.cache.clear();
    console.log('[FallbackCache] Cache cleared');
  }
  
  size(): number {
    return this.cache.size;
  }
}

const fallbackCache = new FallbackCache();

export const fallbackCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to flight API endpoints
  if (!req.path.startsWith('/api/flight/')) {
    return next();
  }
  
  const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
  
  // Override res.json to cache successful responses
  const originalJson = res.json;
  res.json = function(data: any) {
    // Cache successful responses (200-299)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      fallbackCache.set(cacheKey, data, res.statusCode);
    }
    return originalJson.call(this, data);
  };
  
  // Override res.status().json() for error cases
  const originalStatus = res.status;
  res.status = function(code: number) {
    const result = originalStatus.call(this, code);
    
    // If it's a server error (5xx) or timeout, try fallback
    if (code >= 500) {
      const cachedEntry = fallbackCache.get(cacheKey);
      if (cachedEntry) {
        console.log(`[FallbackCache] Using fallback for ${req.path} (original status: ${code})`);
        
        // Track cache hit
        const endpoint = req.path.replace('/api/flight/', '').split('/')[0];
        trackCacheHit(endpoint);
        
        // Set fallback headers
        res.set('X-Cached-Fallback', 'true');
        res.set('X-Cache-Age', ((Date.now() - cachedEntry.timestamp) / 1000).toString());
        
        // Return cached data with 200 status
        return res.status(200).json(cachedEntry.data);
      } else {
        // Track cache miss
        const endpoint = req.path.replace('/api/flight/', '').split('/')[0];
        trackCacheMiss(endpoint);
        
        console.log(`[FallbackCache] No fallback available for ${req.path}`);
      }
    }
    
    return result;
  };
  
  next();
};

// Error handler that triggers fallback
export const errorFallbackHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[FallbackCache] Error occurred: ${err.message}`);
  
  // Check if it's a flight API endpoint
  if (req.path.startsWith('/api/flight/')) {
    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    const cachedEntry = fallbackCache.get(cacheKey);
    
    if (cachedEntry) {
      console.log(`[FallbackCache] Using fallback for error: ${err.message}`);
      
      const endpoint = req.path.replace('/api/flight/', '').split('/')[0];
      trackCacheHit(endpoint);
      
      res.set('X-Cached-Fallback', 'true');
      res.set('X-Cache-Age', ((Date.now() - cachedEntry.timestamp) / 1000).toString());
      res.set('X-Fallback-Reason', 'error');
      
      return res.status(200).json(cachedEntry.data);
    } else {
      const endpoint = req.path.replace('/api/flight/', '').split('/')[0];
      trackCacheMiss(endpoint);
    }
  }
  
  // Pass to next error handler
  next(err);
};

export { fallbackCache };