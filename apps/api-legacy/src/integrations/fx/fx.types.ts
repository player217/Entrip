/**
 * Foreign Exchange (FX) Integration Types
 */

export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  timestamp?: string;
  source?: string;
}

export interface FxRatesResponse {
  rates: Record<string, number>;
  base: string;
  date?: string;
  timestamp?: number;
  success?: boolean;
}

export interface FxProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit?: {
    requestsPerHour: number;
    requestsPerMinute?: number;
  };
}

export interface FxServiceResponse {
  rates: FxRate[] | Record<string, number>;
  cache: 'HIT' | 'MISS' | 'STALE';
  source?: string;
  timestamp?: Date;
}

export interface FxProviderConfig {
  primary: FxProvider;
  secondary: FxProvider;
  fallbackTtlHours?: number;  // How long to use stale data
  maxStaleDays?: number;      // Maximum age for stale fallback
}

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'KRW', 
  'CNY', 'AUD', 'CAD', 'CHF', 'HKD',
  'SGD', 'NOK', 'SEK', 'DKK', 'PLN',
  'CZK', 'HUF', 'RON', 'BGN', 'HRK',
  'RUB', 'TRY', 'BRL', 'MXN', 'INR',
  'IDR', 'THB', 'MYR', 'PHP', 'VND'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export interface CacheEntry {
  id: string;
  base: string;
  quote: string;
  rate: number;
  source: string;
  fetchedAt: Date;
  ttlSec: number;
  isStale: boolean;
  ageSeconds: number;
}

export class FxError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'FxError';
  }
}

export class FxProviderError extends FxError {
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

export class FxCacheError extends FxError {
  constructor(message: string, originalError?: any) {
    super(message, 'CACHE_ERROR');
    this.cause = originalError;
  }
}

export class FxUnavailableError extends FxError {
  constructor(base: string, message = 'All FX providers unavailable and no cached data') {
    super(`${message} for ${base}`, 'FX_UNAVAILABLE');
  }
}