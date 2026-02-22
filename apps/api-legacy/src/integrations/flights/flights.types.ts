/**
 * Flight Integration Types
 */

export interface Airport {
  code: string;
  name: string;
  city: string;
  country?: string;
  region?: string;
}

export interface Route {
  departure: string;
  arrival: string;
  airlines: string[];
  duration: number; // minutes
  distance?: number; // km
}

export interface FlightSchedule {
  flightNo: string;
  airline: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  aircraft?: string;
  status: FlightStatus;
  gate?: string;
  terminal?: string;
  date: string; // ISO date
}

export interface FlightStatus {
  status: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED';
  delay?: number; // minutes
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  estimatedDepartureTime?: string;
  estimatedArrivalTime?: string;
  reason?: string;
}

export interface FlightProvider {
  name: string;
  type: 'ODCLOUD' | 'KAC' | 'MOCK';
  baseUrl: string;
  apiKey?: string;
  dataSource: string; // Description of what data this provider has
}

export interface FlightServiceResponse<T = any> {
  data: T;
  cache: 'HIT' | 'MISS' | 'STALE';
  source: string;
  timestamp: Date;
  dataAge?: number; // seconds
}

export interface FlightSearchParams {
  departure?: string;
  arrival?: string;
  date?: string;
  airline?: string;
  flightNo?: string;
}

export interface FlightCacheEntry {
  id: string;
  flightNo: string;
  date: Date;
  payload: any;
  status: string;
  source: string;
  fetchedAt: Date;
  ttlSec: number;
  isStale: boolean;
  ageSeconds: number;
}

// Provider-specific types
export interface ODCloudScheduleResponse {
  currentCount: number;
  data: Array<{
    공항코드?: string;
    항공사코드?: string;
    항공편명?: string;
    출발지?: string;
    도착지?: string;
    출발시각?: string;
    도착시각?: string;
    운항요일?: string;
    기간시작일?: string;
    기간종료일?: string;
    항공기종?: string;
  }>;
  matchCount: number;
  page: number;
  perPage: number;
  totalCount: number;
}

export interface KACStatusResponse {
  response: {
    body: {
      items: {
        item: Array<{
          airlineKorean?: string;
          airlineEnglish?: string;
          flightId?: string;
          scheduleDateTime?: string;
          estimatedDateTime?: string;
          gatenumber?: string;
          remarkKorean?: string;
          remarkEnglish?: string;
          airport?: string;
          io?: string; // 'I' for arrival, 'O' for departure
        }>;
      };
      totalCount?: number;
    };
  };
}

export class FlightError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'FlightError';
  }
}

export class FlightProviderError extends FlightError {
  constructor(
    provider: string,
    message: string,
    statusCode?: number,
    originalError?: any
  ) {
    super(`${provider}: ${message}`, 'PROVIDER_ERROR', provider, statusCode);
    this.cause = originalError;
  }
}

export class FlightUnavailableError extends FlightError {
  constructor(searchParams: FlightSearchParams, message = 'All flight providers unavailable and no cached data') {
    super(`${message} for search: ${JSON.stringify(searchParams)}`, 'FLIGHT_UNAVAILABLE');
  }
}

// Supported airports (Korean major airports + international)
export const MAJOR_AIRPORTS = {
  // Korean airports
  'ICN': { name: 'Incheon International Airport', city: 'Seoul', country: 'KR' },
  'GMP': { name: 'Gimpo International Airport', city: 'Seoul', country: 'KR' },
  'PUS': { name: 'Busan Gimhae International Airport', city: 'Busan', country: 'KR' },
  'CJU': { name: 'Jeju International Airport', city: 'Jeju', country: 'KR' },
  'TAE': { name: 'Daegu International Airport', city: 'Daegu', country: 'KR' },
  
  // International airports
  'NRT': { name: 'Narita International Airport', city: 'Tokyo', country: 'JP' },
  'HND': { name: 'Haneda Airport', city: 'Tokyo', country: 'JP' },
  'KIX': { name: 'Kansai International Airport', city: 'Osaka', country: 'JP' },
  'PVG': { name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'CN' },
  'PEK': { name: 'Beijing Capital International Airport', city: 'Beijing', country: 'CN' },
  'LAX': { name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'US' },
  'JFK': { name: 'John F. Kennedy International Airport', city: 'New York', country: 'US' },
  'LHR': { name: 'Heathrow Airport', city: 'London', country: 'GB' },
  'CDG': { name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR' },
  'FRA': { name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  'SIN': { name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG' },
  'HKG': { name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'HK' },
  'BKK': { name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' }
} as const;

export type SupportedAirportCode = keyof typeof MAJOR_AIRPORTS;