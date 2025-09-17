/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

import { ApiError, ErrorCategory, ErrorSeverity } from './ApiError';

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Blocking requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds to wait before moving to half-open */
  recoveryTimeoutMs: number;
  /** Number of successful requests needed to close circuit when half-open */
  successThreshold: number;
  /** Time window in milliseconds for failure counting */
  timeWindowMs: number;
  /** Minimum number of requests in time window before considering opening */
  minimumRequestThreshold: number;
  /** Custom function to determine if error should count as failure */
  shouldCountFailure?: (error: ApiError) => boolean;
  /** Callback when circuit state changes */
  onStateChange?: (oldState: CircuitState, newState: CircuitState, reason: string) => void;
  /** Callback when circuit is opened */
  onCircuitOpen?: (failures: number, errors: ApiError[]) => void;
  /** Callback when circuit is closed */
  onCircuitClose?: () => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  requestCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  stateChangedAt: number;
  timeWindow: {
    start: number;
    end: number;
  };
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
  error?: ApiError;
}

/**
 * Circuit Breaker implementation with time window-based failure tracking
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private lastStateChange: number = Date.now();
  private requestHistory: RequestRecord[] = [];
  private halfOpenSuccessCount: number = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.moveToHalfOpen();
      } else {
        throw this.createCircuitOpenError();
      }
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR',
        undefined,
        ErrorCategory.UNKNOWN,
        ErrorSeverity.MEDIUM,
        { timestamp: Date.now() }
      );

      this.recordFailure(apiError);
      throw apiError;
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    this.cleanupOldRecords();
    
    const currentWindow = this.getCurrentTimeWindow();
    const windowRecords = this.getRecordsInWindow(currentWindow);
    
    const failureCount = windowRecords.filter(r => !r.success).length;
    const successCount = windowRecords.filter(r => r.success).length;
    const lastFailure = windowRecords.filter(r => !r.success).pop();
    const lastSuccess = windowRecords.filter(r => r.success).pop();

    return {
      state: this.state,
      failureCount,
      successCount,
      requestCount: windowRecords.length,
      lastFailureTime: lastFailure?.timestamp,
      lastSuccessTime: lastSuccess?.timestamp,
      stateChangedAt: this.lastStateChange,
      timeWindow: currentWindow
    };
  }

  /**
   * Manually reset circuit breaker to closed state
   */
  reset(): void {
    this.changeState(CircuitState.CLOSED, 'Manual reset');
    this.requestHistory = [];
    this.halfOpenSuccessCount = 0;
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(reason: string = 'Manual force open'): void {
    this.changeState(CircuitState.OPEN, reason);
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Record successful operation
   */
  private recordSuccess(): void {
    const record: RequestRecord = {
      timestamp: Date.now(),
      success: true
    };

    this.requestHistory.push(record);
    this.cleanupOldRecords();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount++;
      
      if (this.halfOpenSuccessCount >= this.config.successThreshold) {
        this.changeState(CircuitState.CLOSED, 'Recovery successful');
        this.halfOpenSuccessCount = 0;
        
        if (this.config.onCircuitClose) {
          this.config.onCircuitClose();
        }
      }
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(error: ApiError): void {
    // Check if this error should count as a failure
    if (this.config.shouldCountFailure && !this.config.shouldCountFailure(error)) {
      return;
    }

    const record: RequestRecord = {
      timestamp: Date.now(),
      success: false,
      error
    };

    this.requestHistory.push(record);
    this.cleanupOldRecords();

    // Reset half-open success count
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount = 0;
      this.changeState(CircuitState.OPEN, 'Failure during half-open state');
      return;
    }

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED && this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  /**
   * Check if circuit should be opened based on failure rate
   */
  private shouldOpenCircuit(): boolean {
    const currentWindow = this.getCurrentTimeWindow();
    const windowRecords = this.getRecordsInWindow(currentWindow);
    
    // Need minimum number of requests
    if (windowRecords.length < this.config.minimumRequestThreshold) {
      return false;
    }

    const failureCount = windowRecords.filter(r => !r.success).length;
    return failureCount >= this.config.failureThreshold;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    const failures = this.getRecentFailures();
    this.changeState(CircuitState.OPEN, `Failure threshold exceeded: ${failures.length} failures`);
    
    if (this.config.onCircuitOpen) {
      this.config.onCircuitOpen(failures.length, failures.map(f => f.error!));
    }
  }

  /**
   * Check if we should attempt recovery (move to half-open)
   */
  private shouldAttemptRecovery(): boolean {
    const timeSinceOpened = Date.now() - this.lastStateChange;
    return timeSinceOpened >= this.config.recoveryTimeoutMs;
  }

  /**
   * Move circuit to half-open state
   */
  private moveToHalfOpen(): void {
    this.changeState(CircuitState.HALF_OPEN, 'Attempting recovery');
    this.halfOpenSuccessCount = 0;
  }

  /**
   * Change circuit state and notify
   */
  private changeState(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState, reason);
    }
  }

  /**
   * Create error for when circuit is open
   */
  private createCircuitOpenError(): ApiError {
    return new ApiError(
      `Circuit breaker '${this.name}' is open`,
      'CIRCUIT_BREAKER_OPEN',
      503,
      ErrorCategory.SERVER,
      ErrorSeverity.HIGH,
      {
        timestamp: Date.now(),
        circuitBreakerName: this.name,
        circuitState: this.state
      },
      true // This is retryable after recovery timeout
    );
  }

  /**
   * Get current time window
   */
  private getCurrentTimeWindow(): { start: number; end: number } {
    const now = Date.now();
    return {
      start: now - this.config.timeWindowMs,
      end: now
    };
  }

  /**
   * Get records within specified time window
   */
  private getRecordsInWindow(window: { start: number; end: number }): RequestRecord[] {
    return this.requestHistory.filter(
      record => record.timestamp >= window.start && record.timestamp <= window.end
    );
  }

  /**
   * Get recent failure records
   */
  private getRecentFailures(): RequestRecord[] {
    const currentWindow = this.getCurrentTimeWindow();
    return this.getRecordsInWindow(currentWindow).filter(r => !r.success);
  }

  /**
   * Clean up old records outside time window
   */
  private cleanupOldRecords(): void {
    const cutoffTime = Date.now() - this.config.timeWindowMs;
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp >= cutoffTime
    );
  }
}

/**
 * Circuit Breaker Manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeoutMs: 30000, // 30 seconds
    successThreshold: 3,
    timeWindowMs: 60000, // 1 minute
    minimumRequestThreshold: 10
  };

  /**
   * Get or create circuit breaker for specific service
   */
  getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const fullConfig = { ...this.defaultConfig, ...config };
      this.circuitBreakers.set(name, new CircuitBreaker(name, fullConfig));
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    this.circuitBreakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach((breaker) => {
      breaker.reset();
    });
  }

  /**
   * Remove circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Utility function to execute operation with circuit breaker
 */
export async function withCircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName, config);
  return circuitBreaker.execute(operation);
}

/**
 * Circuit breaker decorator for methods
 */
export function CircuitBreakerDecorator(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
  return function <T extends Record<string, unknown>>(
    target: T, 
    propertyKey: string, 
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (this: T, ...args: unknown[]) {
      return withCircuitBreaker(
        () => originalMethod.apply(this, args),
        serviceName,
        config
      );
    };

    return descriptor;
  };
}