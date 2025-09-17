/**
 * Advanced Retry Engine with Exponential Backoff
 * Intelligent retry strategy for API requests with comprehensive configuration
 */

import { ApiError, ErrorCategory, ErrorSeverity } from './ApiError';

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Base delay in milliseconds */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds */
  maxDelayMs?: number;
  /** Backoff multiplier (exponential growth factor) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd */
  enableJitter?: boolean;
  /** Custom function to determine if error should be retried */
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
  /** Custom delay calculation function */
  calculateDelay?: (attempt: number, config: RetryConfig) => number;
  /** Callback called before each retry attempt */
  onRetry?: (error: ApiError, attempt: number, delay: number) => void;
}

export interface RetryAttempt {
  attempt: number;
  error: ApiError;
  delay: number;
  timestamp: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  attempts: RetryAttempt[];
  totalDuration: number;
}

/**
 * Default retry configurations for different scenarios
 */
export const RetryConfigs = {
  /** Conservative retry for critical operations */
  CONSERVATIVE: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    enableJitter: true
  } as RetryConfig,

  /** Aggressive retry for non-critical operations */
  AGGRESSIVE: {
    maxAttempts: 5,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2.5,
    enableJitter: true
  } as RetryConfig,

  /** Quick retry for real-time operations */
  QUICK: {
    maxAttempts: 2,
    baseDelayMs: 250,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    enableJitter: false
  } as RetryConfig,

  /** Network-specific retry for network errors */
  NETWORK: {
    maxAttempts: 4,
    baseDelayMs: 2000,
    maxDelayMs: 20000,
    backoffMultiplier: 2,
    enableJitter: true,
    shouldRetry: (error: ApiError) => 
      error.category === ErrorCategory.NETWORK || 
      error.category === ErrorCategory.TIMEOUT
  } as RetryConfig,

  /** No retry for immediate failures */
  NONE: {
    maxAttempts: 1,
    baseDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
    enableJitter: false
  } as RetryConfig
};

export class RetryEngine {
  private abortController: AbortController | null = null;
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig) {
    // Merge with default values
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      baseDelayMs: config.baseDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      enableJitter: config.enableJitter ?? true,
      shouldRetry: config.shouldRetry ?? ((error: ApiError) => 
        error.category === ErrorCategory.NETWORK || 
        error.category === ErrorCategory.TIMEOUT
      ),
      calculateDelay: config.calculateDelay ?? this.defaultCalculateDelay.bind(this),
      onRetry: config.onRetry ?? (() => {})
    };
  }

  /**
   * Default delay calculation with exponential backoff
   */
  private defaultCalculateDelay(attempt: number, config: RetryConfig): number {
    const baseDelayMs = config.baseDelayMs ?? 1000;
    const backoffMultiplier = config.backoffMultiplier ?? 2;
    const maxDelayMs = config.maxDelayMs ?? 30000;
    const enableJitter = config.enableJitter ?? true;
    
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
    
    if (enableJitter) {
      // Add ±25% jitter
      const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(0, cappedDelay + jitter);
    }
    
    return cappedDelay;
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: { url?: string; method?: string } = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: ApiError;

    this.abortController = new AbortController();

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Check if operation was cancelled
        if (this.abortController.signal.aborted) {
          throw new ApiError(
            'Operation cancelled',
            'OPERATION_CANCELLED',
            undefined,
            ErrorCategory.UNKNOWN,
            ErrorSeverity.LOW,
            { ...context, timestamp: Date.now() }
          );
        }

        const result = await operation();
        
        return {
          success: true,
          data: result,
          attempts,
          totalDuration: Date.now() - startTime
        };

      } catch (error) {
        const apiError = error instanceof ApiError ? error : new ApiError(
          error instanceof Error ? error.message : 'Unknown error',
          'UNKNOWN_ERROR',
          undefined,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          { ...context, timestamp: Date.now(), retryCount: attempt }
        );

        lastError = apiError;

        // Record attempt
        const attemptRecord: RetryAttempt = {
          attempt,
          error: apiError,
          delay: 0,
          timestamp: Date.now()
        };

        // Check if we should retry
        const shouldRetry = this.shouldRetryError(apiError, attempt);
        
        if (!shouldRetry || attempt === this.config.maxAttempts) {
          attempts.push(attemptRecord);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        attemptRecord.delay = delay;
        attempts.push(attemptRecord);

        // Call retry callback
        if (this.config.onRetry) {
          this.config.onRetry(apiError, attempt, delay);
        }

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts,
      totalDuration: Date.now() - startTime
    };
  }

  /**
   * Cancel ongoing retry operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Check if error should be retried
   */
  private shouldRetryError(error: ApiError, attempt: number): boolean {
    // Use custom retry logic if provided
    if (this.config.shouldRetry) {
      return this.config.shouldRetry(error, attempt);
    }

    // Don't retry if not marked as retryable
    if (!error.isRetryable) {
      return false;
    }

    // Don't retry certain error categories
    const nonRetryableCategories = [
      ErrorCategory.AUTH,
      ErrorCategory.VALIDATION,
      ErrorCategory.BUSINESS
    ];

    if (nonRetryableCategories.includes(error.category)) {
      return false;
    }

    // Don't retry critical severity errors that aren't network-related
    if (error.severity === ErrorSeverity.CRITICAL && 
        error.category !== ErrorCategory.NETWORK &&
        error.category !== ErrorCategory.TIMEOUT) {
      return false;
    }

    return true;
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number): number {
    // Use custom calculation if provided
    if (this.config.calculateDelay) {
      return this.config.calculateDelay(attempt, this.config);
    }

    // Calculate exponential backoff
    let delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, this.config.maxDelayMs);

    // Add jitter if enabled (±25% randomization)
    if (this.config.enableJitter) {
      const jitterRange = delay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms);
      
      // Cancel sleep if operation is aborted
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Sleep cancelled'));
        });
      }
    });
  }

  /**
   * Create a retry engine with preset configuration
   */
  static create(preset: keyof typeof RetryConfigs): RetryEngine {
    return new RetryEngine(RetryConfigs[preset]);
  }

  /**
   * Create a retry engine with custom configuration
   */
  static custom(config: Partial<RetryConfig>): RetryEngine {
    const defaultConfig = RetryConfigs.CONSERVATIVE;
    return new RetryEngine({ ...defaultConfig, ...config });
  }
}

/**
 * Utility function for simple retry operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: { url?: string; method?: string } = {}
): Promise<T> {
  const engine = RetryEngine.custom(config);
  const result = await engine.execute(operation, context);
  
  if (result.success) {
    return result.data!;
  } else {
    throw result.error;
  }
}

/**
 * Retry decorator for methods
 */
export function Retryable(config: Partial<RetryConfig> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = {
        method: `${target.constructor.name}.${propertyKey}`
      };

      return withRetry(
        () => originalMethod.apply(this, args),
        config,
        context
      );
    };

    return descriptor;
  };
}