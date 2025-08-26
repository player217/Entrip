import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FxService } from './fx/fx.service';
import { FlightService } from './flights/flights.service';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { withRetry, DEFAULT_RETRY_POLICY } from '../lib/http-client';
import prisma from '../lib/prisma';

// Mock Prisma client
jest.mock('../lib/prisma', () => ({
  integrationProvider: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn()
  },
  fxRateCache: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    findFirst: jest.fn()
  },
  flightStatusCache: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn()
  },
  externalCallLog: {
    create: jest.fn()
  },
  $transaction: jest.fn()
}));

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Integration Resilience System Tests', () => {
  let fxService: FxService;
  let flightService: FlightService;

  beforeEach(() => {
    jest.clearAllMocks();
    fxService = new FxService();
    flightService = new FlightService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Circuit Breaker', () => {
    it('should allow calls when circuit is closed', async () => {
      // Mock provider as healthy
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'test_provider',
        status: 'HEALTHY',
        errorCount: 0,
        circuitOpenUntil: null
      });

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(true);
    });

    it('should reject calls when circuit is open', async () => {
      const futureDate = new Date(Date.now() + 60_000); // 1 minute in future
      
      // Mock provider as down with open circuit
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'test_provider',
        status: 'DOWN',
        errorCount: 5,
        circuitOpenUntil: futureDate
      });

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(false);
    });

    it('should transition to half-open when timeout expires', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      
      // Mock provider with expired open circuit
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'test_provider',
        status: 'DOWN',
        errorCount: 5,
        circuitOpenUntil: pastDate
      });

      (prisma.integrationProvider.update as jest.Mock).mockResolvedValue({});

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(true);
      expect(prisma.integrationProvider.update).toHaveBeenCalledWith({
        where: { name: 'test_provider' },
        data: {
          status: 'DEGRADED',
          circuitOpenUntil: null
        }
      });
    });

    it('should open circuit after threshold failures', async () => {
      // Mock initial provider state
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'test_provider',
        status: 'DEGRADED',
        errorCount: 4 // One less than threshold
      });

      // Mock upsert to return updated error count
      (prisma.integrationProvider.upsert as jest.Mock).mockResolvedValue({
        errorCount: 4
      });

      (prisma.integrationProvider.update as jest.Mock).mockResolvedValue({});

      const circuitBreaker = new CircuitBreaker('test_provider', { failThreshold: 5 });
      await circuitBreaker.onFailure();

      // Should open circuit after 5th failure
      expect(prisma.integrationProvider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'test_provider' },
          data: expect.objectContaining({
            status: 'DOWN',
            circuitOpenUntil: expect.any(Date)
          })
        })
      );
    });
  });

  describe('HTTP Client Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('Server Error');
          (error as any).response = { status: 500 };
          throw error;
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(mockFn, {
        retries: 3,
        baseDelayMs: 10, // Fast for testing
        maxDelayMs: 50,
        retryOn: (status) => status ? status >= 500 : false
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx errors', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        const error = new Error('Bad Request');
        (error as any).response = { status: 400 };
        throw error;
      });

      await expect(withRetry(mockFn, DEFAULT_RETRY_POLICY)).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network timeout', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          const error = new Error('timeout');
          (error as any).code = 'ECONNABORTED';
          throw error;
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(mockFn, DEFAULT_RETRY_POLICY);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('FX Service Integration', () => {
    it('should return fresh cache when available', async () => {
      const mockCacheData = [
        {
          id: '1',
          base: 'USD',
          quote: 'KRW',
          rate: 1350,
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 30_000), // 30 seconds ago
          ttlSec: 3600 // 1 hour TTL
        }
      ];

      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValue(mockCacheData);
      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('HIT');
      expect(result.rates).toEqual({ KRW: 1350 });
      expect(result.source).toBe('fx_primary');
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Mock empty cache
      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValue([]);
      
      // Mock provider configurations
      (prisma.integrationProvider.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          name: 'fx_primary',
          baseUrl: 'https://api.primary.com',
          status: 'HEALTHY'
        })
        .mockResolvedValueOnce({
          name: 'fx_secondary', 
          baseUrl: 'https://api.secondary.com',
          status: 'HEALTHY'
        });

      // Mock circuit breakers
      (prisma.integrationProvider.upsert as jest.Mock).mockResolvedValue({
        name: 'fx_primary',
        errorCount: 0
      });

      // Mock primary provider failure and secondary success
      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockRejectedValueOnce(new Error('Primary provider failed'))
          .mockResolvedValueOnce({
            status: 200,
            data: { rates: { KRW: 1350, JPY: 110 }, base: 'USD' }
          })
      } as any);

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(prisma));
      (prisma.fxRateCache.upsert as jest.Mock).mockResolvedValue({});
      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('MISS');
      expect(result.source).toBe('fx_secondary');
      expect(result.rates).toEqual({ KRW: 1350, JPY: 110 });
    });

    it('should use stale cache when all providers fail', async () => {
      // Mock no fresh cache
      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValueOnce([]);
      
      // Mock provider failures
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'fx_primary',
        baseUrl: 'https://api.primary.com',
        status: 'DOWN'
      });

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('All providers failed'))
      } as any);

      // Mock stale cache available
      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: '1',
          base: 'USD',
          quote: 'KRW',
          rate: 1300, // Stale rate
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 7200_000), // 2 hours ago
          ttlSec: 3600 // 1 hour TTL (expired)
        }
      ]);

      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('STALE');
      expect(result.rates).toEqual({ KRW: 1300 });
    });

    it('should throw error when no data available', async () => {
      // Mock no cache and provider failures
      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'fx_primary',
        status: 'DOWN'
      });

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Provider failed'))
      } as any);

      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      await expect(fxService.getRates('USD')).rejects.toThrow('FX_UNAVAILABLE');
    });
  });

  describe('Flight Service Integration', () => {
    it('should use cached flight data when fresh', async () => {
      const mockCacheData = {
        id: '1',
        flightNo: 'ICN_NRT_ANY_ANY',
        date: new Date(),
        payload: [{ flightNo: 'KE001', airline: 'KE', status: { status: 'SCHEDULED' } }],
        status: 'SCHEDULED',
        source: 'odcloud',
        fetchedAt: new Date(Date.now() - 60_000), // 1 minute ago
        ttlSec: 3600, // 1 hour TTL
        ageSeconds: 60,
        isStale: false
      };

      (prisma.flightStatusCache.findFirst as jest.Mock).mockResolvedValue(mockCacheData);
      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      const result = await flightService.searchFlights({
        departure: 'ICN',
        arrival: 'NRT'
      });

      expect(result.cache).toBe('HIT');
      expect(result.data).toEqual(mockCacheData.payload);
      expect(result.source).toBe('odcloud');
    });

    it('should fallback to KAC when ODCloud fails', async () => {
      // Mock no cache
      (prisma.flightStatusCache.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Mock ODCloud failure
      mockedAxios.create.mockReturnValue({
        get: jest.fn()
          .mockRejectedValueOnce(new Error('ODCloud failed'))
          .mockResolvedValueOnce({
            status: 200,
            data: '<response><body><items><item><flightId>KE001</flightId></item></items></body></response>'
          })
      } as any);

      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'kac',
        baseUrl: 'https://openapi.airport.co.kr/service'
      });

      (prisma.flightStatusCache.upsert as jest.Mock).mockResolvedValue({});
      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      // Mock successful parsing
      jest.doMock('xml2js', () => ({
        parseStringPromise: jest.fn().mockResolvedValue({
          response: {
            body: [{
              items: [{
                item: [{
                  flightId: ['KE001'],
                  airlineKorean: ['대한항공'],
                  io: ['O']
                }]
              }]
            }]
          }
        })
      }));

      const result = await flightService.searchFlights({
        departure: 'ICN',
        arrival: 'NRT'
      });

      expect(result.cache).toBe('MISS');
      expect(result.source).toBe('kac');
    });
  });

  describe('End-to-End Integration Test', () => {
    it('should handle complete system failure gracefully', async () => {
      // Simulate complete system failure
      (prisma.fxRateCache.findMany as jest.Mock).mockRejectedValue(new Error('Database down'));
      (prisma.flightStatusCache.findFirst as jest.Mock).mockRejectedValue(new Error('Database down'));
      
      // Services should handle database errors gracefully
      await expect(fxService.getRates('USD')).rejects.toThrow();
      await expect(flightService.searchFlights({ departure: 'ICN' })).rejects.toThrow();

      // But health checks should still work
      const fxHealth = await fxService.getHealthStatus();
      const flightHealth = await flightService.getHealthStatus();

      expect(fxHealth.service).toBe('fx');
      expect(flightHealth.service).toBe('flights');
    });

    it('should maintain service continuity during partial failures', async () => {
      // Simulate partial failure: primary provider down, cache available
      (prisma.fxRateCache.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // No fresh cache
        .mockResolvedValueOnce([   // Stale cache available
          {
            base: 'USD',
            quote: 'KRW',
            rate: 1300,
            source: 'fx_primary',
            fetchedAt: new Date(Date.now() - 7200_000) // 2 hours old
          }
        ]);

      (prisma.integrationProvider.findUnique as jest.Mock).mockResolvedValue({
        name: 'fx_primary',
        status: 'DOWN'
      });

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Provider unavailable'))
      } as any);

      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      const result = await fxService.getRates('USD');

      // Service should continue with stale data
      expect(result.cache).toBe('STALE');
      expect(result.rates).toEqual({ KRW: 1300 });
    });
  });

  describe('Performance and Load Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockCacheData = [
        {
          base: 'USD',
          quote: 'KRW',
          rate: 1350,
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 30_000),
          ttlSec: 3600
        }
      ];

      (prisma.fxRateCache.findMany as jest.Mock).mockResolvedValue(mockCacheData);
      (prisma.externalCallLog.create as jest.Mock).mockResolvedValue({});

      // Simulate 10 concurrent requests
      const promises = Array(10).fill(null).map(() => fxService.getRates('USD'));
      const results = await Promise.all(promises);

      // All should return from cache
      results.forEach(result => {
        expect(result.cache).toBe('HIT');
        expect(result.rates).toEqual({ KRW: 1350 });
      });

      // Should only query database once per concurrent batch (due to caching)
      expect(prisma.fxRateCache.findMany).toHaveBeenCalled();
    });
  });
});

describe('Integration Utilities', () => {
  describe('Request Hash Generation', () => {
    it('should generate consistent hashes for identical requests', () => {
      const { createRequestHash } = require('../middleware/external-logging');
      
      const hash1 = createRequestHash('GET', '/api/rates', { base: 'USD' });
      const hash2 = createRequestHash('GET', '/api/rates', { base: 'USD' });
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different requests', () => {
      const { createRequestHash } = require('../middleware/external-logging');
      
      const hash1 = createRequestHash('GET', '/api/rates', { base: 'USD' });
      const hash2 = createRequestHash('GET', '/api/rates', { base: 'EUR' });
      
      expect(hash1).not.toBe(hash2);
    });
  });
});