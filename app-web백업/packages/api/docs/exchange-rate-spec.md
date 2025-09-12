# Exchange Rate API Integration Specification

## Overview
This document outlines the specification for integrating an external exchange rate API with the Finance module to automatically update currency exchange rates.

## Requirements

### 1. Exchange Rate Provider
- **Recommended Provider**: [ExchangeRate-API](https://app.exchangerate-api.com/) or [Fixer.io](https://fixer.io/)
- **Update Frequency**: Daily at 00:00 UTC
- **Base Currency**: KRW (Korean Won)
- **Required Currencies**: USD, EUR, JPY, CNY, THB, VND, SGD, MYR, IDR

### 2. Implementation Approach

#### Option A: Real-time Fetch (Not Recommended)
```typescript
// Called on each finance record creation
async getExchangeRate(from: string, to: string): Promise<number> {
  const response = await fetch(`${API_URL}/latest/${from}`);
  const data = await response.json();
  return data.rates[to];
}
```

#### Option B: Daily Batch Update (Recommended)
```typescript
// Cron job: 0 0 * * * (daily at midnight)
async updateExchangeRates(): Promise<void> {
  const rates = await fetchLatestRates('KRW');
  await exchangeRateService.bulkUpdate(rates);
}
```

### 3. Data Model

```typescript
interface ExchangeRate {
  id: string;
  baseCurrency: string;      // Always 'KRW'
  targetCurrency: string;    // USD, EUR, etc.
  rate: number;              // Exchange rate
  lastUpdated: Date;         // Last update timestamp
  source: string;            // API provider name
}
```

### 4. Service Interface

```typescript
class ExchangeRateService {
  // Get current exchange rate
  async getRate(from: string, to: string): Promise<number>;
  
  // Update rates from external API
  async updateRatesFromAPI(): Promise<void>;
  
  // Get all rates for a base currency
  async getRatesForBase(base: string): Promise<ExchangeRate[]>;
  
  // Check if rates are stale (> 24 hours old)
  async areRatesStale(): Promise<boolean>;
}
```

### 5. Integration Points

#### Finance Service Enhancement
```typescript
// Before
async create(input: FinanceCreateInput, user: AuthUser) {
  const record = {
    ...input,
    exchangeRate: input.exchangeRate || 1, // Manual input
  };
}

// After
async create(input: FinanceCreateInput, user: AuthUser) {
  let exchangeRate = input.exchangeRate;
  
  if (!exchangeRate && input.currency !== 'KRW') {
    // Automatically fetch current rate
    exchangeRate = await exchangeRateService.getRate(input.currency, 'KRW');
  }
  
  const record = {
    ...input,
    exchangeRate: exchangeRate || 1,
  };
}
```

### 6. Caching Strategy

- **Cache Duration**: 24 hours
- **Cache Key**: `exchange_rate:${from}:${to}:${date}`
- **Fallback**: Use last known rate if API is unavailable

### 7. Error Handling

```typescript
try {
  const rate = await exchangeRateService.getRate(from, to);
  return rate;
} catch (error) {
  logger.error('Failed to fetch exchange rate', { error, from, to });
  
  // Fallback to last known rate
  const lastKnownRate = await exchangeRateService.getLastKnownRate(from, to);
  if (lastKnownRate) {
    return lastKnownRate;
  }
  
  // Final fallback: require manual input
  throw new Error('Exchange rate unavailable. Please provide manually.');
}
```

### 8. Environment Variables

```env
# Exchange Rate API Configuration
EXCHANGE_RATE_API_KEY=your_api_key_here
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4
EXCHANGE_RATE_UPDATE_CRON=0 0 * * *
EXCHANGE_RATE_CACHE_TTL=86400
```

### 9. Monitoring & Alerts

- Alert if rate update fails for 2 consecutive days
- Log all rate updates with timestamp and source
- Monitor API usage to avoid rate limits

### 10. Migration Plan

1. **Phase 1**: Deploy exchange rate service without changing existing behavior
2. **Phase 2**: Start collecting daily rates in background
3. **Phase 3**: Add optional auto-fetch for new records
4. **Phase 4**: Make auto-fetch default behavior
5. **Phase 5**: Backfill historical records with accurate rates

## Security Considerations

- API keys must be stored securely (environment variables)
- Implement rate limiting to prevent API abuse
- Validate all exchange rates are positive numbers
- Log suspicious rate changes (> 20% daily change)

## Future Enhancements

1. **Multi-provider Support**: Fallback to secondary provider if primary fails
2. **Historical Rates**: Store and use historical rates for past transactions
3. **Rate Alerts**: Notify users of significant currency fluctuations
4. **Bulk Conversion**: Convert all records when base currency changes