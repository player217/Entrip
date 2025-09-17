/**
 * Smart Caching Strategies
 * Advanced caching system with multiple strategies, TTL management, and intelligent invalidation
 */

import { logger } from './StructuredLogger';
import { performanceMonitor } from './PerformanceMonitor';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
  size?: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  maxMemoryMB: number;
  enableStats: boolean;
  enableCompression: boolean;
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'random';
  compressionThreshold: number;
  enableMetrics: boolean;
}

export interface CacheStrategy {
  shouldCache(key: string, value: any, metadata?: Record<string, any>): boolean;
  getTtl(key: string, value: any, metadata?: Record<string, any>): number;
  shouldEvict(entry: CacheEntry): boolean;
  onHit(entry: CacheEntry): void;
  onMiss(key: string): void;
  onSet(entry: CacheEntry): void;
  onEvict(entry: CacheEntry): void;
}

/**
 * Adaptive TTL Strategy - Adjusts TTL based on access patterns
 */
export class AdaptiveTtlStrategy implements CacheStrategy {
  private baseSettings: Record<string, { ttl: number; factor: number }> = {};

  constructor(
    private baseTtl: number = 5 * 60 * 1000, // 5 minutes
    private minTtl: number = 30 * 1000, // 30 seconds
    private maxTtl: number = 60 * 60 * 1000 // 1 hour
  ) {}

  shouldCache(key: string, value: any): boolean {
    // Don't cache null/undefined values
    if (value == null) return false;
    
    // Don't cache very large objects
    const size = this.estimateSize(value);
    if (size > 1024 * 1024) return false; // 1MB limit
    
    return true;
  }

  getTtl(key: string, value: any, metadata?: Record<string, any>): number {
    const keyPattern = this.extractKeyPattern(key);
    const settings = this.baseSettings[keyPattern];
    
    if (!settings) {
      this.baseSettings[keyPattern] = { ttl: this.baseTtl, factor: 1.0 };
      return this.baseTtl;
    }

    // Adjust TTL based on historical access patterns
    const accessFrequency = metadata?.accessFrequency || 1;
    const adaptedTtl = settings.ttl * Math.max(0.5, Math.min(2.0, accessFrequency));
    
    return Math.max(this.minTtl, Math.min(this.maxTtl, adaptedTtl));
  }

  shouldEvict(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.createdAt > entry.ttl;
  }

  onHit(entry: CacheEntry): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    // Learn from access patterns
    const keyPattern = this.extractKeyPattern(entry.key);
    const settings = this.baseSettings[keyPattern];
    if (settings) {
      // Increase TTL for frequently accessed items
      settings.factor = Math.min(2.0, settings.factor * 1.1);
      settings.ttl = Math.min(this.maxTtl, settings.ttl * settings.factor);
    }
  }

  onMiss(key: string): void {
    const keyPattern = this.extractKeyPattern(key);
    const settings = this.baseSettings[keyPattern];
    if (settings) {
      // Decrease TTL for frequently missed items
      settings.factor = Math.max(0.5, settings.factor * 0.9);
      settings.ttl = Math.max(this.minTtl, settings.ttl * settings.factor);
    }
  }

  onSet(entry: CacheEntry): void {
    // Track new entries
  }

  onEvict(entry: CacheEntry): void {
    // Learn from evictions
    const keyPattern = this.extractKeyPattern(entry.key);
    const settings = this.baseSettings[keyPattern];
    if (settings && entry.accessCount === 0) {
      // Item was never accessed - reduce TTL
      settings.ttl = Math.max(this.minTtl, settings.ttl * 0.8);
    }
  }

  private extractKeyPattern(key: string): string {
    // Extract pattern from key (e.g., "user:123" -> "user:*")
    return key.replace(/:\d+/g, ':*').replace(/\/\d+/g, '/*');
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size if serialization fails
    }
  }
}

/**
 * Priority-based Strategy - Caches based on content priority
 */
export class PriorityStrategy implements CacheStrategy {
  private priorities: Record<string, number> = {};

  constructor(private defaultPriority: number = 1) {}

  shouldCache(key: string, value: any, metadata?: Record<string, any>): boolean {
    const priority = metadata?.priority || this.getPriority(key);
    return priority > 0;
  }

  getTtl(key: string, value: any, metadata?: Record<string, any>): number {
    const priority = metadata?.priority || this.getPriority(key);
    const baseTtl = 5 * 60 * 1000; // 5 minutes
    
    // Higher priority = longer TTL
    return baseTtl * Math.max(0.1, priority);
  }

  shouldEvict(entry: CacheEntry): boolean {
    const now = Date.now();
    const expired = now - entry.createdAt > entry.ttl;
    const priority = this.getPriority(entry.key);
    
    // High priority items get extended life
    if (priority >= 5 && expired) {
      entry.ttl *= 1.5; // Extend TTL
      return false;
    }
    
    return expired;
  }

  onHit(entry: CacheEntry): void {
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    // Increase priority for frequently accessed items
    const currentPriority = this.getPriority(entry.key);
    this.setPriority(entry.key, Math.min(10, currentPriority * 1.1));
  }

  onMiss(key: string): void {
    // Decrease priority for missed items
    const currentPriority = this.getPriority(key);
    this.setPriority(key, Math.max(0.1, currentPriority * 0.9));
  }

  onSet(entry: CacheEntry): void {
    // Set initial priority if not exists
    if (!this.priorities[entry.key]) {
      this.priorities[entry.key] = this.defaultPriority;
    }
  }

  onEvict(entry: CacheEntry): void {
    // Clean up priority tracking
    delete this.priorities[entry.key];
  }

  setPriority(key: string, priority: number): void {
    this.priorities[key] = priority;
  }

  getPriority(key: string): number {
    return this.priorities[key] || this.defaultPriority;
  }
}

/**
 * Smart Cache with multiple strategies and advanced features
 */
export class SmartCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private strategy: CacheStrategy;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    strategy: CacheStrategy = new AdaptiveTtlStrategy(),
    config: Partial<CacheConfig> = {}
  ) {
    this.config = {
      maxSize: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxMemoryMB: 100,
      enableStats: true,
      enableCompression: false,
      evictionStrategy: 'lru',
      compressionThreshold: 1024,
      enableMetrics: true,
      ...config
    };

    this.strategy = strategy;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0
    };

    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss(key);
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.recordMiss(key);
      this.strategy.onEvict(entry);
      return undefined;
    }

    this.recordHit(entry);
    this.strategy.onHit(entry);
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, options: {
    ttl?: number;
    tags?: string[];
    metadata?: Record<string, any>;
  } = {}): boolean {
    // Check if should cache
    if (!this.strategy.shouldCache(key, value, options.metadata)) {
      return false;
    }

    // Calculate TTL
    const ttl = options.ttl || this.strategy.getTtl(key, value, options.metadata);

    // Create entry
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      tags: options.tags || [],
      size: this.estimateSize(value),
      metadata: options.metadata
    };

    // Check memory limits
    if (!this.hasCapacity(entry)) {
      this.evictEntries();
      
      // Check again after eviction
      if (!this.hasCapacity(entry)) {
        return false;
      }
    }

    // Compress if needed
    if (this.config.enableCompression && entry.size! > this.config.compressionThreshold) {
      entry.value = this.compress(entry.value);
    }

    this.cache.set(key, entry);
    this.recordSet(entry);
    this.strategy.onSet(entry);

    return true;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.recordDelete();
      this.strategy.onEvict(entry);
      return true;
    }
    return false;
  }

  /**
   * Clear cache by tags
   */
  clearByTags(tags: string[]): number {
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        this.strategy.onEvict(entry);
        cleared++;
      }
    }

    this.updateMemoryStats();
    return cleared;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet<U = T>(
    key: string,
    factory: () => Promise<U>,
    options: {
      ttl?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<U> {
    const cached = this.get(key) as U;
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value as any, options);
    return value;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry) || this.strategy.shouldEvict(entry)) {
        this.cache.delete(key);
        this.strategy.onEvict(entry);
        removed++;
      }
    }

    this.updateMemoryStats();
    return removed;
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Dispose cache and cleanup resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.createdAt > entry.ttl;
  }

  private hasCapacity(entry: CacheEntry<T>): boolean {
    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      return false;
    }

    // Check memory limit
    const estimatedMemoryMB = (this.stats.memoryUsage + (entry.size || 0)) / (1024 * 1024);
    if (estimatedMemoryMB > this.config.maxMemoryMB) {
      return false;
    }

    return true;
  }

  private evictEntries(): void {
    const entriesToEvict = Math.max(1, Math.floor(this.cache.size * 0.1)); // Evict 10%
    const entries = Array.from(this.cache.entries());

    // Sort by eviction strategy
    switch (this.config.evictionStrategy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount);
        break;
      case 'ttl':
        entries.sort(([, a], [, b]) => a.createdAt - b.createdAt);
        break;
      case 'random':
        entries.sort(() => Math.random() - 0.5);
        break;
    }

    for (let i = 0; i < entriesToEvict && i < entries.length; i++) {
      const item = entries[i];
      if (!item) continue;
      const [key, entry] = item;
      this.cache.delete(key);
      this.strategy.onEvict(entry);
      this.stats.evictions++;
    }

    this.updateMemoryStats();
  }

  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size
    }
  }

  private compress(value: T): T {
    // Simple compression simulation - in production would use actual compression
    return value;
  }

  private recordHit(entry: CacheEntry<T>): void {
    this.stats.hits++;
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_hits_total', 1, 'counter');
      performanceMonitor.recordMetric('cache_access_count', entry.accessCount, 'gauge');
    }
  }

  private recordMiss(key: string): void {
    this.stats.misses++;
    this.strategy.onMiss(key);
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_misses_total', 1, 'counter');
    }
  }

  private recordSet(entry: CacheEntry<T>): void {
    this.stats.sets++;
    this.updateMemoryStats();
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_sets_total', 1, 'counter');
      performanceMonitor.recordMetric('cache_size', this.cache.size, 'gauge');
    }
  }

  private recordDelete(): void {
    this.stats.deletes++;
    this.updateMemoryStats();
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_deletes_total', 1, 'counter');
    }
  }

  private updateMemoryStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + (entry.size || 0), 0);
  }

  private updateStats(): void {
    this.updateMemoryStats();
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    if (this.config.enableMetrics) {
      performanceMonitor.recordMetric('cache_hit_rate', this.stats.hitRate, 'gauge', '%');
      performanceMonitor.recordMetric('cache_memory_usage_bytes', this.stats.memoryUsage, 'gauge', 'bytes');
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0 && this.config.enableMetrics) {
        performanceMonitor.recordMetric('cache_expired_entries_removed', removed, 'counter');
      }
    }, 60000); // Cleanup every minute
  }
}

/**
 * Multi-level Cache - Combines memory and persistent storage
 */
export class MultiLevelCache<T = any> {
  private l1Cache: SmartCache<T>; // Memory cache
  private l2Cache?: SmartCache<T>; // Persistent cache

  constructor(
    l1Config: Partial<CacheConfig> = {},
    l2Config?: Partial<CacheConfig>
  ) {
    this.l1Cache = new SmartCache(new AdaptiveTtlStrategy(), {
      maxSize: 500,
      maxMemoryMB: 50,
      ...l1Config
    });

    if (l2Config) {
      this.l2Cache = new SmartCache(new PriorityStrategy(), {
        maxSize: 5000,
        maxMemoryMB: 200,
        ...l2Config
      });
    }
  }

  async get(key: string): Promise<T | undefined> {
    // Try L1 first
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      return value;
    }

    // Try L2 if available
    if (this.l2Cache) {
      value = this.l2Cache.get(key);
      if (value !== undefined) {
        // Promote to L1
        this.l1Cache.set(key, value);
        return value;
      }
    }

    return undefined;
  }

  set(key: string, value: T, options: {
    ttl?: number;
    tags?: string[];
    metadata?: Record<string, any>;
    level?: 'l1' | 'l2' | 'both';
  } = {}): boolean {
    const level = options.level || 'both';
    let success = false;

    if (level === 'l1' || level === 'both') {
      success = this.l1Cache.set(key, value, options) || success;
    }

    if ((level === 'l2' || level === 'both') && this.l2Cache) {
      success = this.l2Cache.set(key, value, options) || success;
    }

    return success;
  }

  delete(key: string): boolean {
    let success = false;
    success = this.l1Cache.delete(key) || success;
    if (this.l2Cache) {
      success = this.l2Cache.delete(key) || success;
    }
    return success;
  }

  getStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache?.getStats()
    };
  }

  dispose(): void {
    this.l1Cache.dispose();
    this.l2Cache?.dispose();
  }
}

// Global cache instances
export const apiCache = new SmartCache(new AdaptiveTtlStrategy(), {
  maxSize: 1000,
  maxMemoryMB: 100,
  defaultTtl: 5 * 60 * 1000 // 5 minutes
});

export const dataCache = new MultiLevelCache({
  maxSize: 500,
  maxMemoryMB: 50
}, {
  maxSize: 2000,
  maxMemoryMB: 200
});

/**
 * Cache decorator for methods
 */
export function Cacheable(
  keyGenerator?: (...args: any[]) => string,
  options: { ttl?: number; tags?: string[] } = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      return apiCache.getOrSet(key, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}