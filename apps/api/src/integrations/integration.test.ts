import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FxService } from './fx/fx.service';
import { FlightService } from './flights/flights.service';
import { CircuitBreaker } from '../lib/circuit-breaker';
import { withRetry, DEFAULT_RETRY_POLICY } from '../lib/http-client';
import prisma from '../lib/prisma';
import { asMock, createAsyncMock } from '../test-utils/mock-helpers';
import { Decimal } from '@prisma/client/runtime/library';
import { AxiosError } from '../types/axios-error';

// Mock Prisma client
jest.mock('../lib/prisma', () => ({
  default: {
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
  }
}));

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper function to create a complete mock IntegrationProvider
function createMockProvider(overrides: any = {}) {
  const now = new Date();
  return {
    id: 'test-id',
    name: 'test_provider',
    status: 'HEALTHY' as const,
    baseUrl: 'https://api.test.com',
    createdAt: now,
    updatedAt: now,
    version: 1,
    lastSuccessAt: now,
    lastErrorAt: null,
    errorCount: 0,
    circuitOpenUntil: null,
    ...overrides
  };
}

// Helper function to create a complete mock ExternalCallLog
function createMockCallLog(overrides: any = {}) {
  const now = new Date();
  return {
    id: 'log-id',
    method: 'GET',
    providerName: 'test_provider',
    endpoint: '/api/test',
    statusCode: 200,
    errorType: null,
    durationMs: 100,
    requestHash: 'hash123',
    occurredAt: now,
    ...overrides
  };
}

// Helper function to create a complete mock FxRateCache
function createMockFxRateCache(overrides: any = {}) {
  const now = new Date();
  return {
    id: 'fx-cache-id',
    base: 'USD',
    quote: 'KRW',
    rate: new Decimal(1350),
    source: 'fx_primary',
    fetchedAt: now,
    ttlSec: 3600,
    ...overrides
  };
}

// Helper function to create a complete mock FlightStatusCache
function createMockFlightStatusCache(overrides: any = {}) {
  const now = new Date();
  return {
    id: 'flight-cache-id',
    flightNo: 'KE001',
    date: now,
    status: 'ON_TIME',
    source: 'odcloud',
    fetchedAt: now,
    ttlSec: 300,
    payload: {} as any,
    ...overrides
  };
}

// Helper function to create an AxiosError
function createAxiosError(status: number, message: string, code?: string): AxiosError {
  const error = new Error(message) as AxiosError;
  error.response = {
    status,
    statusText: message,
    data: { error: message },
    headers: {}
  };
  error.code = code;
  error.isAxiosError = true;
  return error;
}

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
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          status: 'HEALTHY',
          errorCount: 0,
          circuitOpenUntil: null
        })
      );

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(true);
    });

    it('should reject calls when circuit is open', async () => {
      const futureDate = new Date(Date.now() + 60_000); // 1 minute in future
      
      // Mock provider as down with open circuit
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          status: 'DOWN',
          errorCount: 5,
          circuitOpenUntil: futureDate
        })
      );

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(false);
    });

    it('should transition to half-open when timeout expires', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      
      // Mock provider with expired open circuit
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          status: 'DOWN',
          errorCount: 5,
          circuitOpenUntil: pastDate
        })
      );

      asMock(prisma.integrationProvider.update).mockResolvedValue(createMockProvider());

      const circuitBreaker = new CircuitBreaker('test_provider');
      const canCall = await circuitBreaker.canCall();
      
      expect(canCall).toBe(true);
      expect(asMock(prisma.integrationProvider.update)).toHaveBeenCalledWith({
        where: { name: 'test_provider' },
        data: {
          status: 'DEGRADED',
          circuitOpenUntil: null
        }
      });
    });

    it('should open circuit after threshold failures', async () => {
      // Mock initial provider state
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          status: 'DEGRADED',
          errorCount: 4 // One less than threshold
        })
      );

      // Mock upsert to return updated error count
      asMock(prisma.integrationProvider.upsert).mockResolvedValue(
        createMockProvider({ errorCount: 4 })
      );

      asMock(prisma.integrationProvider.update).mockResolvedValue(createMockProvider());

      const circuitBreaker = new CircuitBreaker('test_provider', { failThreshold: 5 });
      await circuitBreaker.onFailure();

      // Should open circuit after 5th failure
      expect(asMock(prisma.integrationProvider.update)).toHaveBeenCalledWith(
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
          throw createAxiosError(500, 'Server Error');
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(async () => mockFn(), {
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
        throw createAxiosError(400, 'Bad Request');
      });

      await expect(withRetry(async () => mockFn(), DEFAULT_RETRY_POLICY)).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network timeout', async () => {
      let callCount = 0;
      const mockFn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw createAxiosError(0, 'timeout', 'ECONNABORTED');
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(async () => mockFn(), DEFAULT_RETRY_POLICY);

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
          rate: new Decimal(1350),
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 30_000), // 30 seconds ago
          ttlSec: 3600 // 1 hour TTL
        }
      ];

      asMock(prisma.fxRateCache.findMany).mockResolvedValue(mockCacheData);
      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('HIT');
      expect(result.rates).toEqual({ KRW: 1350 });
      expect(result.source).toBe('fx_primary');
    });

    it('should fallback to secondary provider when primary fails', async () => {
      // Mock empty cache
      asMock(prisma.fxRateCache.findMany).mockResolvedValue([]);
      
      // Mock provider configurations
      asMock(prisma.integrationProvider.findUnique as any)
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
      asMock(prisma.integrationProvider.upsert).mockResolvedValue(
        createMockProvider({
          name: 'fx_primary',
          errorCount: 0
        })
      );

      // Mock primary provider failure and secondary success
      const mockGet = jest.fn() as any;
      mockGet.mockRejectedValueOnce(createAxiosError(500, 'Primary provider failed'));
      mockGet.mockResolvedValueOnce({
        status: 200,
        data: { rates: { KRW: 1350, JPY: 110 }, base: 'USD' }
      });
      
      mockedAxios.create.mockReturnValue({
        get: mockGet,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        request: jest.fn(),
        defaults: {},
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      } as any);

      asMock(prisma.$transaction).mockImplementation(async (fn) => fn(prisma));
      asMock(prisma.fxRateCache.upsert).mockResolvedValue(createMockFxRateCache());
      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('MISS');
      expect(result.source).toBe('fx_secondary');
      expect(result.rates).toEqual({ KRW: 1350, JPY: 110 });
    });

    it('should use stale cache when all providers fail', async () => {
      // Mock no fresh cache
      asMock(prisma.fxRateCache.findMany).mockResolvedValueOnce([]);
      
      // Mock provider failures
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          name: 'fx_primary',
          baseUrl: 'https://api.primary.com',
          status: 'DOWN'
        })
      );

      const mockGetFailed = jest.fn() as any;
      mockGetFailed.mockRejectedValue(createAxiosError(503, 'All providers failed'));
      
      mockedAxios.create.mockReturnValue({
        get: mockGetFailed,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        request: jest.fn(),
        defaults: {},
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      } as any);

      // Mock stale cache available
      asMock(prisma.fxRateCache.findMany).mockResolvedValueOnce([
        {
          id: '1',
          base: 'USD',
          quote: 'KRW',
          rate: new Decimal(1300), // Stale rate
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 7200_000), // 2 hours ago
          ttlSec: 3600 // 1 hour TTL (expired)
        }
      ]);

      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

      const result = await fxService.getRates('USD');

      expect(result.cache).toBe('STALE');
      expect(result.rates).toEqual({ KRW: 1300 });
    });

    it('should throw error when no data available', async () => {
      // Mock no cache and provider failures
      asMock(prisma.fxRateCache.findMany).mockResolvedValue([]);
      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          name: 'fx_primary',
          status: 'DOWN'
        })
      );

      const mockGetProvider = jest.fn() as any;
      mockGetProvider.mockRejectedValue(createAxiosError(503, 'Provider failed'));
      
      mockedAxios.create.mockReturnValue({
        get: mockGetProvider,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        request: jest.fn(),
        defaults: {},
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      } as any);

      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

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

      asMock(prisma.flightStatusCache.findFirst).mockResolvedValue(mockCacheData);
      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

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
      asMock(prisma.flightStatusCache.findFirst).mockResolvedValue(null);
      
      // Mock ODCloud failure
      mockedAxios.create.mockReturnValue({
        get: (jest.fn() as any)
          .mockRejectedValueOnce(createAxiosError(503, 'ODCloud failed'))
          .mockResolvedValueOnce({
            status: 200,
            data: '<response><body><items><item><flightId>KE001</flightId></item></items></body></response>'
          }),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        request: jest.fn(),
        defaults: {},
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      } as any);

      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          name: 'kac',
          baseUrl: 'https://openapi.airport.co.kr/service'
        })
      );

      asMock(prisma.flightStatusCache.upsert).mockResolvedValue(createMockFlightStatusCache());
      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

      // Mock successful parsing
      const mockParseString = jest.fn() as any;
      mockParseString.mockResolvedValue({
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
      });
      
      jest.doMock('xml2js', () => ({
        parseStringPromise: mockParseString
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
      asMock(prisma.fxRateCache.findMany).mockRejectedValue(new Error('Database down'));
      asMock(prisma.flightStatusCache.findFirst).mockRejectedValue(new Error('Database down'));
      
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
      asMock(prisma.fxRateCache.findMany as any)
        .mockResolvedValueOnce([]) // No fresh cache
        .mockResolvedValueOnce([   // Stale cache available
          createMockFxRateCache({
            base: 'USD',
            quote: 'KRW',
            rate: new Decimal(1300),
            source: 'fx_primary',
            fetchedAt: new Date(Date.now() - 7200_000) // 2 hours old
          })
        ]);

      asMock(prisma.integrationProvider.findUnique).mockResolvedValue(
        createMockProvider({
          name: 'fx_primary',
          status: 'DOWN'
        })
      );

      const mockGetUnavailable = jest.fn() as any;
      mockGetUnavailable.mockRejectedValue(createAxiosError(503, 'Provider unavailable'));
      
      mockedAxios.create.mockReturnValue({
        get: mockGetUnavailable,
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        head: jest.fn(),
        options: jest.fn(),
        request: jest.fn(),
        defaults: {},
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
      } as any);

      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

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
          id: 'cache-1',
          base: 'USD',
          quote: 'KRW',
          rate: new Decimal(1350),
          source: 'fx_primary',
          fetchedAt: new Date(Date.now() - 30_000),
          ttlSec: 3600
        }
      ];

      asMock(prisma.fxRateCache.findMany).mockResolvedValue(mockCacheData);
      asMock(prisma.externalCallLog.create).mockResolvedValue(createMockCallLog());

      // Simulate 10 concurrent requests
      const promises = Array(10).fill(null).map(() => fxService.getRates('USD'));
      const results = await Promise.all(promises);

      // All should return from cache
      results.forEach(result => {
        expect(result.cache).toBe('HIT');
        expect(result.rates).toEqual({ KRW: 1350 });
      });

      // Should only query database once per concurrent batch (due to caching)
      expect(asMock(prisma.fxRateCache.findMany)).toHaveBeenCalled();
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