import prisma from "../../lib/prisma";
import { createHttpClient, withRetry, DEFAULT_RETRY_POLICY } from "../../lib/http-client";
import { CircuitBreaker, createCircuitBreaker, CircuitBreakerProfiles } from "../../lib/circuit-breaker";
import { parseStringPromise } from 'xml2js';
import {
  FlightSchedule,
  FlightServiceResponse,
  FlightSearchParams,
  FlightCacheEntry,
  ODCloudScheduleResponse,
  KACStatusResponse,
  FlightProviderError,
  FlightUnavailableError,
  MAJOR_AIRPORTS,
  SupportedAirportCode
} from "./flights.types";

/**
 * Flight Service with resilience patterns
 * Integrates with existing ODCloud and KAC APIs
 */
export class FlightService {
  private odcloudCircuit: CircuitBreaker;
  private kacCircuit: CircuitBreaker;
  
  private readonly OD_API_KEY: string;
  private readonly OD_BASE = "https://api.odcloud.kr/api";
  private readonly KAC_XML_BASE = "https://openapi.airport.co.kr/service";
  
  // API endpoints
  private readonly UDDI_DOM_SCHED = "15043890/v1/uddi:57dcf102-1447-49e9-bd2b-cfb32e869d5c";
  private readonly UDDI_INTL_SCHED = "15003087/v1/uddi:5cb8f7fa-d1e0-4d0f-a9f9-5b7aab9569d5";
  private readonly FLIGHT_STATUS_API = "FlightStatusListDTL/v1/getFlightStatusListDetail";

  constructor() {
    this.OD_API_KEY = decodeURIComponent(process.env.ODCLOUD_API_KEY || "");
    
    // Initialize circuit breakers
    this.odcloudCircuit = createCircuitBreaker('odcloud', CircuitBreakerProfiles.STANDARD);
    this.kacCircuit = createCircuitBreaker('kac', CircuitBreakerProfiles.FAST);

    if (!this.OD_API_KEY) {
      console.warn('[FlightService] WARNING: ODCLOUD_API_KEY not configured');
    }
  }

  /**
   * Search flight schedules with resilience patterns
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightServiceResponse<FlightSchedule[]>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(params);

    try {
      // 1) Check fresh cache first
      const freshCache = await this.getFreshCache(params);
      if (freshCache) {
        await this.logExternalCall('cache', '/search', 'GET', 200, null, Date.now() - startTime);
        return {
          data: this.parseFlightData(freshCache.payload),
          cache: 'HIT',
          source: freshCache.source,
          timestamp: freshCache.fetchedAt,
          dataAge: freshCache.ageSeconds
        };
      }

      // 2) Try ODCloud first (has Asiana data)
      try {
        const odcloudResult = await this.fetchFromODCloud(params);
        await this.cacheFlightData(cacheKey, odcloudResult, 'odcloud');
        return {
          data: odcloudResult,
          cache: 'MISS',
          source: 'odcloud',
          timestamp: new Date()
        };
      } catch (odcloudError) {
        console.warn('ODCloud flight API failed, trying KAC:', odcloudError.message);

        // 3) Try KAC as secondary
        try {
          const kacResult = await this.fetchFromKAC(params);
          await this.cacheFlightData(cacheKey, kacResult, 'kac');
          return {
            data: kacResult,
            cache: 'MISS',
            source: 'kac',
            timestamp: new Date()
          };
        } catch (kacError) {
          console.warn('KAC flight API also failed:', kacError.message);

          // 4) Fallback to stale cache
          const staleCache = await this.getStaleCache(params);
          if (staleCache) {
            console.log(`Using stale flight cache, age: ${staleCache.ageSeconds}s`);
            return {
              data: this.parseFlightData(staleCache.payload),
              cache: 'STALE',
              source: staleCache.source,
              timestamp: staleCache.fetchedAt,
              dataAge: staleCache.ageSeconds
            };
          }

          // 5) Complete failure
          throw new FlightUnavailableError(params);
        }
      }
    } catch (error) {
      await this.logExternalCall('flight_service', '/search', 'GET', null, 'SERVICE_ERROR', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get flight status (real-time)
   */
  async getFlightStatus(flightNo: string, date: string): Promise<FlightServiceResponse<any>> {
    const cacheKey = `${flightNo}_${date}`;
    const startTime = Date.now();

    try {
      // Check for recent cache (shorter TTL for real-time data)
      const freshCache = await this.getFreshStatusCache(flightNo, date);
      if (freshCache) {
        return {
          data: this.parseFlightData(freshCache.payload),
          cache: 'HIT',
          source: freshCache.source,
          timestamp: freshCache.fetchedAt,
          dataAge: freshCache.ageSeconds
        };
      }

      // Try KAC for real-time status (better for status updates)
      try {
        const kacStatus = await this.fetchStatusFromKAC(flightNo, date);
        await this.cacheFlightStatus(flightNo, date, kacStatus, 'kac');
        return {
          data: kacStatus,
          cache: 'MISS',
          source: 'kac',
          timestamp: new Date()
        };
      } catch (kacError) {
        // Fallback to stale data for status
        const staleCache = await this.getStaleStatusCache(flightNo, date);
        if (staleCache) {
          return {
            data: this.parseFlightData(staleCache.payload),
            cache: 'STALE',
            source: staleCache.source,
            timestamp: staleCache.fetchedAt,
            dataAge: staleCache.ageSeconds
          };
        }
        
        throw new FlightProviderError('flight_status', `No data available for flight ${flightNo} on ${date}`);
      }
    } catch (error) {
      await this.logExternalCall('flight_service', `/status/${flightNo}`, 'GET', null, 'SERVICE_ERROR', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Fetch from ODCloud API with circuit breaker
   */
  private async fetchFromODCloud(params: FlightSearchParams): Promise<FlightSchedule[]> {
    if (!this.OD_API_KEY) {
      throw new FlightProviderError('odcloud', 'API key not configured');
    }

    return await this.odcloudCircuit.execute(async () => {
      const client = createHttpClient(this.OD_BASE, 10000);
      const startTime = Date.now();

      const endpoint = params.departure && this.isDomesticRoute(params.departure, params.arrival) 
        ? this.UDDI_DOM_SCHED 
        : this.UDDI_INTL_SCHED;

      const response = await withRetry(async () => {
        return await client.get(`/${endpoint}`, {
          params: {
            serviceKey: this.OD_API_KEY,
            numOfRows: 100,
            pageNo: 1,
            ...this.buildODCloudParams(params)
          }
        });
      }, DEFAULT_RETRY_POLICY);

      const duration = Date.now() - startTime;
      await this.logExternalCall('odcloud', `/${endpoint}`, 'GET', response.status, null, duration);

      return this.parseODCloudResponse(response.data);
    });
  }

  /**
   * Fetch from KAC API with circuit breaker
   */
  private async fetchFromKAC(params: FlightSearchParams): Promise<FlightSchedule[]> {
    return await this.kacCircuit.execute(async () => {
      const client = createHttpClient(this.KAC_XML_BASE, 8000);
      const startTime = Date.now();

      const response = await withRetry(async () => {
        return await client.get(`/${this.FLIGHT_STATUS_API}`, {
          params: {
            serviceKey: process.env.KAC_API_KEY || '',
            ...this.buildKACParams(params)
          }
        });
      }, DEFAULT_RETRY_POLICY);

      const duration = Date.now() - startTime;
      await this.logExternalCall('kac', `/${this.FLIGHT_STATUS_API}`, 'GET', response.status, null, duration);

      return this.parseKACResponse(response.data);
    });
  }

  /**
   * Fetch flight status from KAC
   */
  private async fetchStatusFromKAC(flightNo: string, date: string): Promise<any> {
    return await this.kacCircuit.execute(async () => {
      const client = createHttpClient(this.KAC_XML_BASE, 5000);
      
      const response = await withRetry(async () => {
        return await client.get(`/${this.FLIGHT_STATUS_API}`, {
          params: {
            serviceKey: process.env.KAC_API_KEY || '',
            flightId: flightNo,
            schDate: date.replace(/-/g, '')
          }
        });
      }, DEFAULT_RETRY_POLICY);

      return this.parseKACStatusResponse(response.data);
    });
  }

  /**
   * Cache management methods
   */
  private async getFreshCache(params: FlightSearchParams): Promise<FlightCacheEntry | null> {
    const cacheKey = this.generateCacheKey(params);
    const cached = await prisma.flightStatusCache.findFirst({
      where: { flightNo: cacheKey },
      orderBy: { fetchedAt: 'desc' }
    });

    if (!cached) return null;

    const ageSeconds = Math.floor((Date.now() - cached.fetchedAt.getTime()) / 1000);
    if (ageSeconds >= cached.ttlSec) return null;

    return {
      ...cached,
      ageSeconds,
      isStale: false
    };
  }

  private async getFreshStatusCache(flightNo: string, date: string): Promise<FlightCacheEntry | null> {
    const cached = await prisma.flightStatusCache.findUnique({
      where: { flightNo_date: { flightNo, date: new Date(date) } }
    });

    if (!cached) return null;

    const ageSeconds = Math.floor((Date.now() - cached.fetchedAt.getTime()) / 1000);
    // Status cache has shorter TTL (5 minutes)
    if (ageSeconds >= 300) return null;

    return {
      ...cached,
      ageSeconds,
      isStale: false
    };
  }

  private async getStaleCache(params: FlightSearchParams, maxAgeDays = 3): Promise<FlightCacheEntry | null> {
    const cacheKey = this.generateCacheKey(params);
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs);

    const cached = await prisma.flightStatusCache.findFirst({
      where: { 
        flightNo: cacheKey,
        fetchedAt: { gte: cutoff }
      },
      orderBy: { fetchedAt: 'desc' }
    });

    if (!cached) return null;

    const ageSeconds = Math.floor((Date.now() - cached.fetchedAt.getTime()) / 1000);
    return {
      ...cached,
      ageSeconds,
      isStale: true
    };
  }

  private async getStaleStatusCache(flightNo: string, date: string): Promise<FlightCacheEntry | null> {
    const cached = await prisma.flightStatusCache.findUnique({
      where: { flightNo_date: { flightNo, date: new Date(date) } }
    });

    if (!cached) return null;

    const ageSeconds = Math.floor((Date.now() - cached.fetchedAt.getTime()) / 1000);
    // Allow stale status data up to 2 hours
    if (ageSeconds > 7200) return null;

    return {
      ...cached,
      ageSeconds,
      isStale: true
    };
  }

  /**
   * Utility methods
   */
  private generateCacheKey(params: FlightSearchParams): string {
    return `${params.departure || 'ANY'}_${params.arrival || 'ANY'}_${params.date || 'ANY'}_${params.airline || 'ANY'}`;
  }

  private isDomesticRoute(departure?: string, arrival?: string): boolean {
    const koreanAirports = ['ICN', 'GMP', 'PUS', 'CJU', 'TAE'];
    return !!(departure && arrival && 
      koreanAirports.includes(departure) && 
      koreanAirports.includes(arrival));
  }

  private buildODCloudParams(params: FlightSearchParams): Record<string, any> {
    const odParams: Record<string, any> = {};
    
    if (params.departure) odParams['DEPT'] = params.departure;
    if (params.arrival) odParams['ARR'] = params.arrival;
    if (params.airline) odParams['AL'] = params.airline;
    
    return odParams;
  }

  private buildKACParams(params: FlightSearchParams): Record<string, any> {
    const kacParams: Record<string, any> = {};
    
    if (params.flightNo) kacParams['flightId'] = params.flightNo;
    if (params.date) kacParams['schDate'] = params.date.replace(/-/g, '');
    
    return kacParams;
  }

  private async cacheFlightData(key: string, data: FlightSchedule[], source: string): Promise<void> {
    try {
      await prisma.flightStatusCache.upsert({
        where: { flightNo_date: { flightNo: key, date: new Date() } },
        update: {
          payload: data,
          status: 'CACHED',
          source,
          fetchedAt: new Date(),
          ttlSec: 3600 // 1 hour for schedule data
        },
        create: {
          flightNo: key,
          date: new Date(),
          payload: data,
          status: 'CACHED',
          source,
          fetchedAt: new Date(),
          ttlSec: 3600
        }
      });
    } catch (error) {
      console.error('Failed to cache flight data:', error);
    }
  }

  private async cacheFlightStatus(flightNo: string, date: string, data: any, source: string): Promise<void> {
    try {
      await prisma.flightStatusCache.upsert({
        where: { flightNo_date: { flightNo, date: new Date(date) } },
        update: {
          payload: data,
          status: data.status || 'UNKNOWN',
          source,
          fetchedAt: new Date(),
          ttlSec: 300 // 5 minutes for status data
        },
        create: {
          flightNo,
          date: new Date(date),
          payload: data,
          status: data.status || 'UNKNOWN',
          source,
          fetchedAt: new Date(),
          ttlSec: 300
        }
      });
    } catch (error) {
      console.error('Failed to cache flight status:', error);
    }
  }

  private parseODCloudResponse(data: ODCloudScheduleResponse): FlightSchedule[] {
    if (!data.data) return [];

    return data.data.map(item => ({
      flightNo: item.항공편명 || '',
      airline: item.항공사코드 || '',
      departure: item.출발지 || '',
      arrival: item.도착지 || '',
      departureTime: item.출발시각 || '',
      arrivalTime: item.도착시각 || '',
      aircraft: item.항공기종,
      status: { status: 'SCHEDULED' as const },
      date: new Date().toISOString().split('T')[0]
    }));
  }

  private async parseKACResponse(xmlData: string): Promise<FlightSchedule[]> {
    try {
      const parsed = await parseStringPromise(xmlData);
      const items = parsed?.response?.body?.[0]?.items?.[0]?.item || [];

      return items.map((item: any) => ({
        flightNo: item.flightId?.[0] || '',
        airline: item.airlineKorean?.[0] || item.airlineEnglish?.[0] || '',
        departure: item.io?.[0] === 'O' ? 'ICN' : item.airport?.[0] || '',
        arrival: item.io?.[0] === 'I' ? 'ICN' : item.airport?.[0] || '',
        departureTime: item.scheduleDateTime?.[0] || '',
        arrivalTime: item.estimatedDateTime?.[0] || item.scheduleDateTime?.[0] || '',
        status: {
          status: this.parseKACStatus(item.remarkKorean?.[0] || item.remarkEnglish?.[0])
        },
        gate: item.gatenumber?.[0],
        date: new Date().toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Failed to parse KAC XML response:', error);
      return [];
    }
  }

  private parseKACStatusResponse(xmlData: string): any {
    // Similar parsing logic for status-specific response
    return this.parseKACResponse(xmlData);
  }

  private parseKACStatus(remark?: string): 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' {
    if (!remark) return 'SCHEDULED';
    
    const remarkLower = remark.toLowerCase();
    if (remarkLower.includes('지연') || remarkLower.includes('delay')) return 'DELAYED';
    if (remarkLower.includes('취소') || remarkLower.includes('cancel')) return 'CANCELLED';
    if (remarkLower.includes('탑승') || remarkLower.includes('board')) return 'BOARDING';
    if (remarkLower.includes('출발') || remarkLower.includes('depart')) return 'DEPARTED';
    if (remarkLower.includes('도착') || remarkLower.includes('arrive')) return 'ARRIVED';
    
    return 'SCHEDULED';
  }

  private parseFlightData(payload: any): any {
    return payload; // Payload is already parsed
  }

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
   * Get health status of flight service
   */
  async getHealthStatus() {
    const [odcloudStats, kacStats] = await Promise.all([
      this.odcloudCircuit.getStats(),
      this.kacCircuit.getStats()
    ]);

    return {
      service: 'flights',
      providers: [odcloudStats, kacStats],
      overall: odcloudStats.isHealthy || kacStats.isHealthy ? 'HEALTHY' : 'DOWN'
    };
  }
}