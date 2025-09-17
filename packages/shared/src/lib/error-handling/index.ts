/**
 * Error Handling System - Centralized exports
 * Enterprise-grade error handling with classification, retry, circuit breaker, and request management
 */

// Import for internal use
import { 
  RetryConfigs as RetryConfigsInternal, 
  RetryConfig as RetryConfigInternal,
  RetryEngine as RetryEngineInternal 
} from './RetryEngine';
import { ErrorClassifier as ErrorClassifierInternal } from './ApiError';
import { CircuitBreaker as CircuitBreakerInternal } from './CircuitBreaker';
import { RequestManager as RequestManagerInternal } from './RequestManager';

// Core Error System
export {
  ApiError,
  ErrorClassifier,
  ErrorFactory,
  ErrorCategory,
  ErrorSeverity,
  type ErrorContext
} from './ApiError';

// Retry Engine
export {
  RetryEngine,
  RetryConfigs,
  withRetry,
  Retryable,
  type RetryConfig,
  type RetryAttempt,
  type RetryResult
} from './RetryEngine';

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  withCircuitBreaker,
  CircuitBreakerDecorator,
  CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerMetrics
} from './CircuitBreaker';

// Request Manager
export {
  ManagedRequest,
  RequestManager,
  requestManager,
  createManagedRequest,
  useRequestManager,
  type RequestOptions,
  type RequestMetadata
} from './RequestManager';

// Utility types and constants
export interface ErrorHandlingConfig {
  enableRetry: boolean;
  enableCircuitBreaker: boolean;
  enableRequestManagement: boolean;
  retryConfig: Partial<RetryConfigInternal>;
  globalConcurrencyLimit: number;
}

export const DefaultErrorHandlingConfig: ErrorHandlingConfig = {
  enableRetry: true,
  enableCircuitBreaker: true,
  enableRequestManagement: true,
  retryConfig: RetryConfigsInternal.CONSERVATIVE,
  globalConcurrencyLimit: 10
};

// Error handling strategies for different scenarios
export const ErrorHandlingStrategies = {
  // Critical operations requiring maximum reliability
  CRITICAL: {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableRequestManagement: true,
    retryConfig: RetryConfigsInternal.CONSERVATIVE,
    globalConcurrencyLimit: 5
  },

  // Standard operations with balanced reliability/performance
  STANDARD: {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableRequestManagement: true,
    retryConfig: RetryConfigsInternal.CONSERVATIVE,
    globalConcurrencyLimit: 10
  },

  // High-throughput operations prioritizing performance
  PERFORMANCE: {
    enableRetry: true,
    enableCircuitBreaker: false,
    enableRequestManagement: true,
    retryConfig: RetryConfigsInternal.QUICK,
    globalConcurrencyLimit: 20
  },

  // Real-time operations requiring low latency
  REALTIME: {
    enableRetry: false,
    enableCircuitBreaker: false,
    enableRequestManagement: false,
    retryConfig: RetryConfigsInternal.NONE,
    globalConcurrencyLimit: 50
  },

  // Development/testing environment
  DEVELOPMENT: {
    enableRetry: true,
    enableCircuitBreaker: false,
    enableRequestManagement: false,
    retryConfig: RetryConfigsInternal.QUICK,
    globalConcurrencyLimit: 5
  }
} as const;

/**
 * Create error handling configuration for specific scenario
 */
export function createErrorHandlingConfig(
  strategy: keyof typeof ErrorHandlingStrategies,
  overrides: Partial<ErrorHandlingConfig> = {}
): ErrorHandlingConfig {
  return {
    ...ErrorHandlingStrategies[strategy],
    ...overrides
  };
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandler(): void {
  if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('unhandledrejection', (event) => {
      const error = ErrorClassifierInternal.classify(event.reason);
      console.error('Unhandled promise rejection:', error.toJSON());
      
      // Report critical errors
      if (error.shouldReport()) {
        // Could integrate with error reporting service here
      }
    });

    window.addEventListener('error', (event) => {
      const error = ErrorClassifierInternal.classify(event.error);
      console.error('Unhandled error:', error.toJSON());
      
      if (error.shouldReport()) {
        // Could integrate with error reporting service here
      }
    });
  } else {
    // Node.js environment
    process.on('unhandledRejection', (reason) => {
      const error = ErrorClassifierInternal.classify(reason);
      console.error('Unhandled promise rejection:', error.toJSON());
    });

    process.on('uncaughtException', (error) => {
      const apiError = ErrorClassifierInternal.classify(error);
      console.error('Uncaught exception:', apiError.toJSON());
    });
  }
}

/**
 * Utility to check if error handling is available
 */
export function isErrorHandlingAvailable(): boolean {
  // Since all modules are imported at the top, they should always be available
  // This function is kept for backward compatibility but always returns true
  return true;
}