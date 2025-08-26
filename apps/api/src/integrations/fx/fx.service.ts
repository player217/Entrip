import prisma from "../../lib/prisma";
import { createHttpClient, withRetry, DEFAULT_RETRY_POLICY } from "../../lib/http-client";
import { CircuitBreaker, createCircuitBreaker, CircuitBreakerProfiles } from "../../lib/circuit-breaker";
import { 
  FxRatesResponse, 
  FxServiceResponse, 
  FxProviderError, 
  FxUnavailableError,
  CacheEntry,
  SupportedCurrency 
} from "./fx.types";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Foreign Exchange Service with resilience patterns
 * Implements: Circuit Breaker + Retry + Cache + Fallback + Monitoring
 */
export class FxService {
  private primaryCircuit: CircuitBreaker;
  private secondaryCircuit: CircuitBreaker;

  constructor() {
    // Initialize circuit breakers for both providers
    this.primaryCircuit = createCircuitBreaker('fx_primary', CircuitBreakerProfiles.STANDARD);
    this.secondaryCircuit = createCircuitBreaker('fx_secondary', CircuitBreakerProfiles.FAST);
  }

  /**
   * Get exchange rates with full resilience pattern:
   * 1. Check fresh cache
   * 2. Try primary provider -> secondary provider
   * 3. Fallback to stale cache
   * 4. Fail with comprehensive error
   */
  async getRates(base: SupportedCurrency): Promise<FxServiceResponse> {
    const startTime = Date.now();

    try {
      // 1) Check for fresh cached data first
      const freshCache = await this.getFreshCache(base);
      if (freshCache.length > 0) {
        await this.logExternalCall('cache', `/rates/${base}`, 'GET', 200, null, Date.now() - startTime);
        return { 
          rates: this.formatRatesFromCache(freshCache), 
          cache: 'HIT',
          source: freshCache[0]?.source,
          timestamp: freshCache[0]?.fetchedAt
        };
      }

      // 2) Try providers in order: primary -> secondary
      try {
        const primaryResult = await this.fetchFromProvider('fx_primary', base);
        await this.cacheRates(base, primaryResult.rates, 'fx_primary');
        return { rates: primaryResult.rates, cache: 'MISS', source: 'fx_primary' };
      } catch (primaryError) {
        console.warn('Primary FX provider failed, trying secondary:', primaryError.message);
        
        try {
          const secondaryResult = await this.fetchFromProvider('fx_secondary', base);
          await this.cacheRates(base, secondaryResult.rates, 'fx_secondary');
          return { rates: secondaryResult.rates, cache: 'MISS', source: 'fx_secondary' };
        } catch (secondaryError) {
          console.warn('Secondary FX provider also failed:', secondaryError.message);
          
          // 3) Last resort: try stale cache
          const staleCache = await this.getStaleCache(base);
          if (staleCache.length > 0) {
            await this.logExternalCall('cache_stale', `/rates/${base}`, 'GET', 200, null, Date.now() - startTime);
            console.log(`Using stale FX cache for ${base}, age: ${staleCache[0].ageSeconds}s`);
            return { 
              rates: this.formatRatesFromCache(staleCache), 
              cache: 'STALE',
              source: staleCache[0]?.source,
              timestamp: staleCache[0]?.fetchedAt
            };
          }

          // 4) Complete failure
          throw new FxUnavailableError(base, 'All FX providers failed and no cached data available');
        }
      }
    } catch (error) {
      await this.logExternalCall('fx_service', `/rates/${base}`, 'GET', null, 'SERVICE_ERROR', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get single exchange rate between two currencies
   */
  async getRate(from: SupportedCurrency, to: SupportedCurrency): Promise<number> {
    if (from === to) return 1.0;

    const rates = await this.getRates(from);
    
    if (Array.isArray(rates.rates)) {
      const rate = rates.rates.find(r => r.quote === to);
      if (!rate) throw new Error(`Rate not found for ${from}/${to}`);
      return rate.rate;
    } else {
      const rate = rates.rates[to];
      if (rate === undefined) throw new Error(`Rate not found for ${from}/${to}`);
      return rate;
    }
  }

  /**
   * Fetch rates from a specific provider with circuit breaker protection
   */
  private async fetchFromProvider(providerName: 'fx_primary' | 'fx_secondary', base: string): Promise<FxRatesResponse> {
    const circuit = providerName === 'fx_primary' ? this.primaryCircuit : this.secondaryCircuit;
    const startTime = Date.now();

    return await circuit.execute(async () => {
      const provider = await this.getProviderConfig(providerName);
      const client = createHttpClient(provider.baseUrl, 5000);
      
      const response = await withRetry(async () => {
        return await client.get(`/rates`, {
          params: { base },
          headers: provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : undefined
        });
      }, DEFAULT_RETRY_POLICY);

      const duration = Date.now() - startTime;
      await this.logExternalCall(providerName, `/rates?base=${base}`, 'GET', response.status, null, duration);

      return this.normalizeResponse(response.data, base);
    });
  }

  /**
   * Get fresh cached rates (within TTL)
   */
  private async getFreshCache(base: string): Promise<CacheEntry[]> {
    const cached = await prisma.fxRateCache.findMany({
      where: { base },
      orderBy: { fetchedAt: 'desc' },
      take: 50
    });

    const now = new Date();
    return cached
      .map(c => ({
        ...c,
        rate: Number(c.rate),
        ageSeconds: Math.floor((now.getTime() - c.fetchedAt.getTime()) / 1000),
        isStale: false
      }))
      .filter(c => c.ageSeconds < c.ttlSec);
  }

  /**
   * Get stale cached rates (beyond TTL but still usable)
   */
  private async getStaleCache(base: string, maxAgeDays = 7): Promise<CacheEntry[]> {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs);

    const cached = await prisma.fxRateCache.findMany({
      where: { 
        base,
        fetchedAt: { gte: cutoff }
      },
      orderBy: { fetchedAt: 'desc' },
      take: 50
    });

    const now = new Date();
    return cached.map(c => ({
      ...c,
      rate: Number(c.rate),
      ageSeconds: Math.floor((now.getTime() - c.fetchedAt.getTime()) / 1000),
      isStale: true
    }));
  }

  /**
   * Cache exchange rates
   */
  private async cacheRates(base: string, rates: Record<string, number> | any, source: string): Promise<void> {
    const ratesObj = Array.isArray(rates) ? 
      rates.reduce((acc, r) => ({ ...acc, [r.quote]: r.rate }), {}) : 
      rates;

    await prisma.$transaction(async (tx) => {
      for (const [quote, rate] of Object.entries(ratesObj)) {
        if (typeof rate === 'number') {
          await tx.fxRateCache.upsert({
            where: { base_quote: { base, quote } },
            update: { 
              rate: new Decimal(rate), 
              source, 
              fetchedAt: new Date(),
              ttlSec: 86400 // 24 hours
            },
            create: { 
              base, 
              quote, 
              rate: new Decimal(rate), 
              source, 
              fetchedAt: new Date(),
              ttlSec: 86400
            }
          });
        }
      }
    });
  }

  /**
   * Format cached rates for response
   */
  private formatRatesFromCache(cache: CacheEntry[]): Record<string, number> {
    return cache.reduce((acc, c) => ({ ...acc, [c.quote]: c.rate }), {});
  }

  /**
   * Get provider configuration from database
   */
  private async getProviderConfig(name: string): Promise<{ baseUrl: string; apiKey?: string }> {
    const provider = await prisma.integrationProvider.findUnique({
      where: { name }
    });

    if (!provider) {
      // Create default provider if not exists
      await prisma.integrationProvider.create({
        data: {
          name,
          baseUrl: this.getDefaultBaseUrl(name),
          status: 'HEALTHY'
        }
      });
      return { baseUrl: this.getDefaultBaseUrl(name) };
    }

    return { 
      baseUrl: provider.baseUrl,
      apiKey: process.env[`${name.toUpperCase()}_API_KEY`]
    };
  }

  private getDefaultBaseUrl(providerName: string): string {
    const defaults: Record<string, string> = {
      'fx_primary': 'https://api.exchangerate-api.com/v4/latest',
      'fx_secondary': 'https://api.fixer.io/latest'
    };
    return defaults[providerName] || 'https://api.exchangerate-api.com/v4/latest';
  }

  /**
   * Normalize different provider response formats
   */
  private normalizeResponse(data: any, base: string): FxRatesResponse {
    // Handle different response formats from various providers
    if (data.rates) {
      return {
        rates: data.rates,
        base: data.base || base,
        date: data.date,
        timestamp: data.timestamp,
        success: data.success !== false
      };
    }

    // Fallback for simple rate objects
    return {
      rates: data,
      base,
      success: true
    };
  }

  /**
   * Log external API call for monitoring
   */
  private async logExternalCall(
    provider: string, 
    endpoint: string, 
    method: string, 
    statusCode: number | null, 
    errorType: string | null, 
    durationMs: number
  ): Promise<void> {
    try {
      await prisma.externalCallLog.create({
        data: {
          providerName: provider,
          endpoint,
          method,
          statusCode,
          errorType,
          durationMs,
          requestHash: `${method}:${endpoint}:${Date.now()}`
        }
      });
    } catch (error) {
      console.error('Failed to log external call:', error);
    }
  }

  /**
   * Get health status of FX service
   */
  async getHealthStatus() {
    const [primaryStats, secondaryStats] = await Promise.all([
      this.primaryCircuit.getStats(),
      this.secondaryCircuit.getStats()
    ]);

    return {
      service: 'fx',
      providers: [primaryStats, secondaryStats],
      overall: primaryStats.isHealthy || secondaryStats.isHealthy ? 'HEALTHY' : 'DOWN'
    };
  }
}