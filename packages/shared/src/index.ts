// Server-safe exports (can be imported in API routes)
// Re-export everything from server for backwards compatibility
export * from './types/user';
export * from './types/auth';
// Ensure runtime enums are exported (avoid folder index shadowing)
export { BookingStatus, BookingType } from './types/booking';
export * from './types/booking';
export * from './types/booking-extended';
// Explicitly re-export UserRole to resolve ambiguity
export { UserRole } from './types/user';
export * from './types/booking-adapter';
export * from './types/team-booking';
export * from './types/log';
export * from './types/prisma-bridge';
export * from './services/bookingService';
export * from './services/teamBookingService';
export { AuthService, createAuthService, getAuthService } from './services/AuthService';
export type { AuthConfig } from './services/AuthService';
export * from './utils/logger';
export * from './utils/debounce';
export * from './utils/dateUtils';
export { logger } from './lib/logger';

// Legacy API client exports (deprecated - use unified-api-client)
export { apiClient, API_ENDPOINTS, handleApiError } from './lib/apiClient';

// Enhanced unified API client exports (v3.0)
export { apiClient as unifiedApiClient } from './lib/unified-api-client';
export { wsManager } from './lib/websocket-manager';

// Comprehensive Error Handling System
export * from './lib/error-handling';

// Monitoring and Performance System (explicit exports to resolve conflicts)
export {
  StructuredLogger,
  PerformanceTracker,
  logger as structuredLogger,
  createLogger,
  LogPerformance,
  PerformanceMonitor,
  MetricsCollector,
  AlertSystem,
  performanceMonitor,
  MonitorPerformance,
  SmartCache,
  MultiLevelCache,
  AdaptiveTtlStrategy,
  PriorityStrategy,
  apiCache,
  dataCache,
  Cacheable,
  MonitoringPresets,
  setupMonitoring,
  type PerformanceMetric,
  type PerformanceAlert,
  type PerformanceReport,
  type PerformanceConfig,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
  type CacheStrategy
} from './lib/monitoring';

// Advanced Features
export * from './lib/advanced';

// Testing Framework (server-safe utilities)
export {
  TestRunner,
  Assert,
  TestUtils,
  testFramework,
  TestingPresets,
  TestDataGenerators,
  testing,
  setupTesting,
  type TestConfig,
  type TestContext,
  type TestResult,
  type TestSuite,
  type TestCase
} from './lib/testing';

// Migration helpers
export { 
  legacyApiClient, 
  axiosInstance as unifiedAxiosInstance,
  api as unifiedApi 
} from './lib/migration-adapter';

// Hook exports (Client-only - must be imported from @entrip/shared/client)
// Removed from main export to prevent server component issues

// Data exports
export * from './data/korean-airports';
export * from './data/international-airports';
// export * from './data/all-airports'; // Temporarily disabled due to conflicts
// export * from './data/flight-routes'; // Temporarily disabled due to conflicts

// Flight API exports
export * from './lib/flightApi';

// Enterprise-grade API Client Configuration Presets
export const EnterpriseApiClient = {
  // Production configuration with all enterprise features
  PRODUCTION: {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableRequestManagement: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      enableJitter: true
    },
    defaultTimeout: 30000,
    globalConcurrencyLimit: 20
  },

  // Development configuration with debugging
  DEVELOPMENT: {
    enableRetry: true,
    enableCircuitBreaker: false,
    enableRequestManagement: false,
    defaultTimeout: 10000,
    onApiError: (error: Error) => console.warn('API Error:', error),
    onNetworkError: (error: Error) => console.error('Network Error:', error)
  },

  // Testing configuration with minimal overhead
  TESTING: {
    enableRetry: false,
    enableCircuitBreaker: false,
    enableRequestManagement: false,
    defaultTimeout: 5000
  }
};

// Client-only exports (must be imported explicitly from /client)
// NOTE: Do not use these in API routes or server components
// Instead, import from '@entrip/shared/client' when needed in client components
