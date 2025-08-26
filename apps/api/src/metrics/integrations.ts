import client from 'prom-client';
import { getExternalCallStats, getProviderErrorRate } from '../middleware/external-logging';
import { FxService } from '../integrations/fx/fx.service';
import { FlightService } from '../integrations/flights/flights.service';
import prisma from '../lib/prisma';

// Create metrics registry
const register = new client.Registry();

// External API request duration histogram
export const extReqDuration = new client.Histogram({
  name: 'external_request_duration_seconds',
  help: 'Duration of external API requests in seconds',
  labelNames: ['provider', 'endpoint', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30] // seconds
});

// External API request error counter
export const extReqErrors = new client.Counter({
  name: 'external_request_errors_total',
  help: 'Total number of external API request errors',
  labelNames: ['provider', 'error_type', 'status_code']
});

// External API request success counter
export const extReqSuccess = new client.Counter({
  name: 'external_request_success_total',
  help: 'Total number of successful external API requests',
  labelNames: ['provider', 'endpoint']
});

// Circuit breaker state gauge
export const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_open',
  help: 'Circuit breaker state (1 = open, 0 = closed)',
  labelNames: ['provider']
});

// Cache hit rate gauge
export const cacheHitRate = new client.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type', 'provider']
});

// Integration provider health gauge
export const providerHealth = new client.Gauge({
  name: 'integration_provider_health',
  help: 'Integration provider health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['provider', 'service']
});

// Stale cache usage counter
export const staleCacheUsage = new client.Counter({
  name: 'stale_cache_usage_total',
  help: 'Total number of times stale cache was used',
  labelNames: ['provider', 'service']
});

// API response size histogram
export const apiResponseSize = new client.Histogram({
  name: 'external_api_response_size_bytes',
  help: 'Size of external API responses in bytes',
  labelNames: ['provider', 'endpoint'],
  buckets: [100, 1000, 10000, 100000, 1000000] // bytes
});

// Register all metrics
register.registerMetric(extReqDuration);
register.registerMetric(extReqErrors);
register.registerMetric(extReqSuccess);
register.registerMetric(circuitBreakerState);
register.registerMetric(cacheHitRate);
register.registerMetric(providerHealth);
register.registerMetric(staleCacheUsage);
register.registerMetric(apiResponseSize);

/**
 * Update metrics based on external call logs
 */
export async function updateExternalCallMetrics(): Promise<void> {
  try {
    // Get stats for the last 5 minutes
    const stats = await getExternalCallStats(5);
    
    // Update cache hit rates and provider health
    for (const [provider, callCount] of Object.entries(stats.callsPerProvider)) {
      const providerStats = await getProviderErrorRate(provider, 5);
      
      // Update provider health metric
      providerHealth.set(
        { provider, service: getServiceForProvider(provider) },
        providerStats.isHealthy ? 1 : 0
      );
    }

    // Update error metrics
    for (const [errorType, count] of Object.entries(stats.errorBreakdown)) {
      // Note: This is a simplified approach - in production you'd track this more precisely
      extReqErrors.inc({ provider: 'all', error_type: errorType, status_code: 'unknown' }, count);
    }

  } catch (error) {
    console.error('Failed to update external call metrics:', error);
  }
}

/**
 * Update circuit breaker metrics
 */
export async function updateCircuitBreakerMetrics(): Promise<void> {
  try {
    const providers = await prisma.integrationProvider.findMany({
      select: { name: true, status: true, circuitOpenUntil: true }
    });

    for (const provider of providers) {
      const isOpen = provider.circuitOpenUntil && provider.circuitOpenUntil > new Date() ? 1 : 0;
      circuitBreakerState.set({ provider: provider.name }, isOpen);
    }
  } catch (error) {
    console.error('Failed to update circuit breaker metrics:', error);
  }
}

/**
 * Update cache metrics
 */
export async function updateCacheMetrics(): Promise<void> {
  try {
    // Get cache statistics from the last hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // FX cache stats
    const fxCacheStats = await prisma.fxRateCache.groupBy({
      by: ['source'],
      where: { fetchedAt: { gte: oneHourAgo } },
      _count: { id: true }
    });

    for (const stat of fxCacheStats) {
      cacheHitRate.set(
        { cache_type: 'fx_rates', provider: stat.source },
        calculateCacheHitRate('fx', stat.source)
      );
    }

    // Flight cache stats
    const flightCacheStats = await prisma.flightStatusCache.groupBy({
      by: ['source'],
      where: { fetchedAt: { gte: oneHourAgo } },
      _count: { id: true }
    });

    for (const stat of flightCacheStats) {
      cacheHitRate.set(
        { cache_type: 'flight_status', provider: stat.source },
        calculateCacheHitRate('flight', stat.source)
      );
    }
  } catch (error) {
    console.error('Failed to update cache metrics:', error);
  }
}

/**
 * Helper function to calculate cache hit rate
 */
async function calculateCacheHitRate(cacheType: string, provider: string): Promise<number> {
  try {
    // This is a simplified calculation - in production you'd track hits/misses more precisely
    const recentStats = await getExternalCallStats(60, provider);
    const cacheHits = recentStats.callsPerProvider['cache'] || 0;
    const totalCalls = Object.values(recentStats.callsPerProvider).reduce((sum, count) => sum + count, 0);
    
    return totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;
  } catch (error) {
    console.error('Failed to calculate cache hit rate:', error);
    return 0;
  }
}

/**
 * Map provider name to service type
 */
function getServiceForProvider(provider: string): string {
  if (provider.startsWith('fx_')) return 'fx';
  if (['odcloud', 'kac'].includes(provider)) return 'flights';
  if (provider === 'cache' || provider === 'cache_stale') return 'cache';
  return 'unknown';
}

/**
 * Record external API call metrics (use this in your HTTP client interceptors)
 */
export function recordExternalCall(
  provider: string,
  endpoint: string,
  method: string,
  durationSeconds: number,
  statusCode?: number,
  responseSize?: number,
  errorType?: string
): void {
  // Record duration
  extReqDuration.observe(
    { provider, endpoint, method },
    durationSeconds
  );

  // Record response size if provided
  if (responseSize !== undefined) {
    apiResponseSize.observe(
      { provider, endpoint },
      responseSize
    );
  }

  // Record success or error
  if (statusCode && statusCode >= 200 && statusCode < 400) {
    extReqSuccess.inc({ provider, endpoint });
  } else if (errorType || (statusCode && statusCode >= 400)) {
    extReqErrors.inc({ 
      provider, 
      error_type: errorType || `HTTP_${statusCode}`,
      status_code: statusCode?.toString() || 'unknown'
    });
  }
}

/**
 * Record cache usage metrics
 */
export function recordCacheUsage(provider: string, service: string, cacheType: 'hit' | 'miss' | 'stale'): void {
  if (cacheType === 'stale') {
    staleCacheUsage.inc({ provider, service });
  }
  
  // Update cache hit rate metric
  // This is simplified - in production you'd maintain running counters
  const hitRate = cacheType === 'hit' ? 100 : (cacheType === 'miss' ? 0 : 50); // stale = 50%
  cacheHitRate.set({ cache_type: service, provider }, hitRate);
}

/**
 * Initialize metrics collection
 */
export function initializeMetricsCollection(): void {
  // Update metrics every 30 seconds
  setInterval(async () => {
    await Promise.allSettled([
      updateExternalCallMetrics(),
      updateCircuitBreakerMetrics(),
      updateCacheMetrics()
    ]);
  }, 30_000); // 30 seconds

  console.log('Integration metrics collection initialized');
}

/**
 * Get metrics for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  // Update metrics before scraping
  await Promise.allSettled([
    updateExternalCallMetrics(),
    updateCircuitBreakerMetrics(),
    updateCacheMetrics()
  ]);

  return register.metrics();
}

/**
 * Health check for integration services
 */
export async function getIntegrationHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  services: Record<string, any>;
  timestamp: Date;
}> {
  try {
    const fxService = new FxService();
    const flightService = new FlightService();

    const [fxHealth, flightHealth] = await Promise.allSettled([
      fxService.getHealthStatus(),
      flightService.getHealthStatus()
    ]);

    const services = {
      fx: fxHealth.status === 'fulfilled' ? fxHealth.value : { error: fxHealth.reason?.message },
      flights: flightHealth.status === 'fulfilled' ? flightHealth.value : { error: flightHealth.reason?.message }
    };

    // Determine overall status
    const fxStatus = services.fx.overall || 'DOWN';
    const flightStatus = services.flights.overall || 'DOWN';
    
    let status: 'healthy' | 'degraded' | 'down';
    if (fxStatus === 'HEALTHY' && flightStatus === 'HEALTHY') {
      status = 'healthy';
    } else if (fxStatus === 'DOWN' && flightStatus === 'DOWN') {
      status = 'down';
    } else {
      status = 'degraded';
    }

    return {
      status,
      services,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      status: 'down',
      services: { error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date()
    };
  }
}

export { register as metricsRegistry };