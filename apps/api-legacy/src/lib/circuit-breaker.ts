import prisma from "./prisma";
import { ProviderStatus } from "@prisma/client";

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, calls are rejected
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failThreshold: number;    // Number of failures to open circuit
  openTimeoutMs: number;    // Time to keep circuit open
  halfOpenMaxCalls: number; // Max calls in half-open state
}

export class CircuitBreaker {
  private static readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failThreshold: 5,
    openTimeoutMs: 60_000,  // 1 minute
    halfOpenMaxCalls: 3
  };

  private config: CircuitBreakerConfig;
  
  constructor(
    private providerName: string, 
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...CircuitBreaker.DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if we can make a call to the provider
   */
  async canCall(): Promise<boolean> {
    const provider = await this.getOrCreateProvider();
    
    // If circuit is not open, we can call
    if (!provider.circuitOpenUntil) {
      return true;
    }
    
    // Check if open timeout has passed
    if (provider.circuitOpenUntil <= new Date()) {
      // Transition to half-open state
      await this.transitionToHalfOpen();
      return true;
    }
    
    // Circuit is still open
    return false;
  }

  /**
   * Get current circuit state
   */
  async getState(): Promise<CircuitState> {
    const provider = await this.getOrCreateProvider();
    
    if (!provider.circuitOpenUntil) {
      return CircuitState.CLOSED;
    }
    
    if (provider.circuitOpenUntil <= new Date()) {
      return CircuitState.HALF_OPEN;
    }
    
    return CircuitState.OPEN;
  }

  /**
   * Record a successful call
   */
  async onSuccess(): Promise<void> {
    await prisma.integrationProvider.upsert({
      where: { name: this.providerName },
      update: { 
        status: ProviderStatus.HEALTHY, 
        errorCount: 0, 
        lastSuccessAt: new Date(), 
        circuitOpenUntil: null 
      },
      create: { 
        name: this.providerName, 
        baseUrl: "", 
        status: ProviderStatus.HEALTHY, 
        errorCount: 0,
        lastSuccessAt: new Date()
      }
    });

    console.log(`Circuit breaker: SUCCESS for ${this.providerName}, circuit reset to CLOSED`);
  }

  /**
   * Record a failed call
   */
  async onFailure(error?: any): Promise<void> {
    const provider = await this.getOrCreateProvider();
    const newErrorCount = provider.errorCount + 1;

    // Update error count and last error time
    await prisma.integrationProvider.update({
      where: { name: this.providerName },
      data: { 
        errorCount: newErrorCount,
        lastErrorAt: new Date(),
        status: newErrorCount >= this.config.failThreshold ? ProviderStatus.DOWN : ProviderStatus.DEGRADED
      }
    });

    // Open circuit if threshold reached
    if (newErrorCount >= this.config.failThreshold) {
      await this.openCircuit();
    }

    console.log(`Circuit breaker: FAILURE for ${this.providerName}, error count: ${newErrorCount}/${this.config.failThreshold}`, {
      error: error?.message || 'Unknown error',
      status: error?.response?.status,
      circuitState: newErrorCount >= this.config.failThreshold ? CircuitState.OPEN : CircuitState.CLOSED
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!(await this.canCall())) {
      throw new Error(`Circuit breaker OPEN for provider: ${this.providerName}`);
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(error);
      throw error;
    }
  }

  /**
   * Get provider statistics
   */
  async getStats(): Promise<{
    providerName: string;
    status: ProviderStatus;
    errorCount: number;
    lastSuccessAt: Date | null;
    lastErrorAt: Date | null;
    circuitState: CircuitState;
    isHealthy: boolean;
  }> {
    const provider = await this.getOrCreateProvider();
    const state = await this.getState();
    
    return {
      providerName: this.providerName,
      status: provider.status,
      errorCount: provider.errorCount,
      lastSuccessAt: provider.lastSuccessAt,
      lastErrorAt: provider.lastErrorAt,
      circuitState: state,
      isHealthy: provider.status === ProviderStatus.HEALTHY && state === CircuitState.CLOSED
    };
  }

  /**
   * Manually reset circuit breaker (for admin operations)
   */
  async reset(): Promise<void> {
    await prisma.integrationProvider.upsert({
      where: { name: this.providerName },
      update: {
        status: ProviderStatus.HEALTHY,
        errorCount: 0,
        circuitOpenUntil: null,
        lastSuccessAt: new Date()
      },
      create: {
        name: this.providerName,
        baseUrl: "",
        status: ProviderStatus.HEALTHY,
        errorCount: 0,
        lastSuccessAt: new Date()
      }
    });

    console.log(`Circuit breaker: MANUAL RESET for ${this.providerName}`);
  }

  private async getOrCreateProvider() {
    return await prisma.integrationProvider.upsert({
      where: { name: this.providerName },
      update: {},
      create: { 
        name: this.providerName, 
        baseUrl: "", 
        status: ProviderStatus.HEALTHY, 
        errorCount: 0 
      }
    });
  }

  private async openCircuit(): Promise<void> {
    const openUntil = new Date(Date.now() + this.config.openTimeoutMs);
    
    await prisma.integrationProvider.update({
      where: { name: this.providerName },
      data: { 
        status: ProviderStatus.DOWN, 
        circuitOpenUntil: openUntil
      }
    });

    console.log(`Circuit breaker: OPENED for ${this.providerName}, will retry after ${openUntil.toISOString()}`);
  }

  private async transitionToHalfOpen(): Promise<void> {
    await prisma.integrationProvider.update({
      where: { name: this.providerName },
      data: {
        status: ProviderStatus.DEGRADED,
        circuitOpenUntil: null  // Remove the timeout to enter half-open state
      }
    });

    console.log(`Circuit breaker: Transitioning to HALF-OPEN for ${this.providerName}`);
  }
}

/**
 * Factory function to create circuit breakers for different providers
 */
export function createCircuitBreaker(
  providerName: string, 
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(providerName, config);
}

/**
 * Predefined configurations for different types of services
 */
export const CircuitBreakerProfiles = {
  // Conservative profile for critical services (slower to open, longer recovery time)
  CRITICAL: {
    failThreshold: 8,
    openTimeoutMs: 120_000, // 2 minutes
    halfOpenMaxCalls: 2
  },
  
  // Standard profile for regular services
  STANDARD: {
    failThreshold: 5,
    openTimeoutMs: 60_000,  // 1 minute
    halfOpenMaxCalls: 3
  },
  
  // Aggressive profile for non-critical services (faster to open, quicker recovery)
  FAST: {
    failThreshold: 3,
    openTimeoutMs: 30_000,  // 30 seconds
    halfOpenMaxCalls: 5
  }
} as const;