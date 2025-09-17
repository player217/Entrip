/**
 * Request Manager with Advanced Cancellation Support
 * Manages request lifecycle, timeouts, and cancellation for optimal resource usage
 */

import { ApiError, ErrorCategory, ErrorSeverity } from './ApiError';

export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom abort signal */
  signal?: AbortSignal;
  /** Request priority (higher numbers = higher priority) */
  priority?: number;
  /** Maximum number of concurrent requests of this type */
  concurrencyLimit?: number;
  /** Request tags for grouping and management */
  tags?: string[];
  /** Whether to automatically cancel on component unmount */
  cancelOnUnmount?: boolean;
  /** Callback when request is cancelled */
  onCancel?: (reason: string) => void;
  /** Callback for request progress */
  onProgress?: (loaded: number, total: number) => void;
}

export interface RequestMetadata {
  id: string;
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  priority: number;
  tags: string[];
  cancelReason?: string;
}

/**
 * Individual request wrapper with cancellation support
 */
export class ManagedRequest<T = any> {
  public readonly id: string;
  public readonly metadata: RequestMetadata;
  private abortController: AbortController;
  private timeoutId?: NodeJS.Timeout;
  private resolvePromise?: (value: T) => void;
  private rejectPromise?: (error: Error) => void;
  private promise: Promise<T>;

  constructor(
    id: string,
    url: string,
    method: string,
    private operation: (signal: AbortSignal) => Promise<T>,
    private options: RequestOptions = {}
  ) {
    this.id = id;
    this.abortController = new AbortController();
    
    this.metadata = {
      id,
      url,
      method,
      startTime: Date.now(),
      status: 'pending',
      priority: options.priority || 0,
      tags: options.tags || []
    };

    // Create promise that will be resolved/rejected externally
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });

    // Set up timeout if specified
    if (options.timeout && options.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.cancel('timeout');
      }, options.timeout);
    }

    // Listen to external abort signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        this.cancel('external abort');
      });
    }

    // Set up cancel callback
    this.abortController.signal.addEventListener('abort', () => {
      if (options.onCancel) {
        options.onCancel(this.metadata.cancelReason || 'unknown');
      }
    });
  }

  /**
   * Execute the request
   */
  async execute(): Promise<T> {
    try {
      this.metadata.status = 'pending';
      
      const result = await this.operation(this.abortController.signal);
      
      this.complete(result);
      return result;
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /**
   * Cancel the request
   */
  cancel(reason: string = 'manual cancellation'): void {
    if (this.metadata.status !== 'pending') {
      return; // Already completed or cancelled
    }

    this.metadata.status = 'cancelled';
    this.metadata.cancelReason = reason;
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Abort the request
    this.abortController.abort();

    // Reject the promise with cancellation error
    const error = new ApiError(
      `Request cancelled: ${reason}`,
      'REQUEST_CANCELLED',
      undefined,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.LOW,
      {
        requestId: this.id,
        url: this.metadata.url,
        method: this.metadata.method,
        timestamp: Date.now(),
        cancelReason: reason
      }
    );

    if (this.rejectPromise) {
      this.rejectPromise(error);
    }
  }

  /**
   * Get the promise for this request
   */
  getPromise(): Promise<T> {
    return this.promise;
  }

  /**
   * Check if request is cancelled
   */
  isCancelled(): boolean {
    return this.abortController.signal.aborted;
  }

  /**
   * Check if request is pending
   */
  isPending(): boolean {
    return this.metadata.status === 'pending';
  }

  /**
   * Mark request as completed
   */
  private complete(result: T): void {
    this.metadata.status = 'completed';
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    if (this.resolvePromise) {
      this.resolvePromise(result);
    }
  }

  /**
   * Mark request as failed
   */
  private fail(error: unknown): void {
    this.metadata.status = 'failed';
    this.metadata.endTime = Date.now();
    this.metadata.duration = this.metadata.endTime - this.metadata.startTime;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    const apiError = error instanceof ApiError ? error : new ApiError(
      error instanceof Error ? error.message : 'Request failed',
      'REQUEST_FAILED',
      undefined,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      {
        requestId: this.id,
        url: this.metadata.url,
        method: this.metadata.method,
        timestamp: Date.now()
      }
    );

    if (this.rejectPromise) {
      this.rejectPromise(apiError);
    }
  }
}

/**
 * Request Manager for handling multiple concurrent requests
 */
export class RequestManager {
  private requests = new Map<string, ManagedRequest>();
  private requestQueue: ManagedRequest[] = [];
  private concurrencyLimits = new Map<string, number>();
  private activeCounts = new Map<string, number>();
  private globalConcurrencyLimit: number = 10;
  private requestIdCounter: number = 0;

  constructor(globalConcurrencyLimit: number = 10) {
    this.globalConcurrencyLimit = globalConcurrencyLimit;
  }

  /**
   * Create and manage a new request
   */
  async createRequest<T>(
    url: string,
    method: string,
    operation: (signal: AbortSignal) => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const request = new ManagedRequest(requestId, url, method, operation, options);
    
    this.requests.set(requestId, request);

    try {
      // Check concurrency limits
      if (this.shouldQueue(request)) {
        this.queueRequest(request);
        await this.waitForSlot(request);
      }

      // Execute the request
      const result = await request.execute();
      this.completeRequest(requestId);
      return result;
    } catch (error) {
      this.completeRequest(requestId);
      throw error;
    }
  }

  /**
   * Cancel specific request by ID
   */
  cancelRequest(requestId: string, reason: string = 'manual cancellation'): boolean {
    const request = this.requests.get(requestId);
    if (request) {
      request.cancel(reason);
      return true;
    }
    return false;
  }

  /**
   * Cancel all requests with specific tag
   */
  cancelRequestsByTag(tag: string, reason: string = 'bulk cancellation'): number {
    let cancelledCount = 0;
    
    this.requests.forEach((request) => {
      if (request.metadata.tags.includes(tag)) {
        request.cancel(reason);
        cancelledCount++;
      }
    });

    return cancelledCount;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(reason: string = 'shutdown'): number {
    let cancelledCount = 0;
    
    this.requests.forEach((request) => {
      if (request.isPending()) {
        request.cancel(reason);
        cancelledCount++;
      }
    });

    return cancelledCount;
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): ManagedRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get all requests with specific tag
   */
  getRequestsByTag(tag: string): ManagedRequest[] {
    return Array.from(this.requests.values()).filter(
      request => request.metadata.tags.includes(tag)
    );
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): ManagedRequest[] {
    return Array.from(this.requests.values()).filter(
      request => request.isPending()
    );
  }

  /**
   * Get request statistics
   */
  getStatistics() {
    const all = Array.from(this.requests.values());
    const pending = all.filter(r => r.metadata.status === 'pending');
    const completed = all.filter(r => r.metadata.status === 'completed');
    const cancelled = all.filter(r => r.metadata.status === 'cancelled');
    const failed = all.filter(r => r.metadata.status === 'failed');

    const avgDuration = completed.length > 0 
      ? completed.reduce((sum, r) => sum + (r.metadata.duration || 0), 0) / completed.length
      : 0;

    return {
      total: all.length,
      pending: pending.length,
      completed: completed.length,
      cancelled: cancelled.length,
      failed: failed.length,
      queued: this.requestQueue.length,
      averageDuration: Math.round(avgDuration),
      concurrencyLimits: Object.fromEntries(this.concurrencyLimits),
      activeCounts: Object.fromEntries(this.activeCounts)
    };
  }

  /**
   * Set concurrency limit for specific request type
   */
  setConcurrencyLimit(type: string, limit: number): void {
    this.concurrencyLimits.set(type, limit);
  }

  /**
   * Set global concurrency limit
   */
  setGlobalConcurrencyLimit(limit: number): void {
    this.globalConcurrencyLimit = limit;
    this.processQueue();
  }

  /**
   * Clean up completed/failed requests older than specified time
   */
  cleanup(olderThanMs: number = 5 * 60 * 1000): number {
    const cutoffTime = Date.now() - olderThanMs;
    let cleanedCount = 0;

    for (const [id, request] of this.requests.entries()) {
      if (request.metadata.status !== 'pending' && 
          (request.metadata.endTime || 0) < cutoffTime) {
        this.requests.delete(id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private generateRequestId(): string {
    return `req_${++this.requestIdCounter}_${Date.now()}`;
  }

  private shouldQueue(request: ManagedRequest): boolean {
    const totalActive = this.getPendingRequests().length;
    if (totalActive >= this.globalConcurrencyLimit) {
      return true;
    }

    // Check type-specific limits
    for (const tag of request.metadata.tags) {
      const limit = this.concurrencyLimits.get(tag);
      if (limit !== undefined) {
        const activeCount = this.activeCounts.get(tag) || 0;
        if (activeCount >= limit) {
          return true;
        }
      }
    }

    return false;
  }

  private queueRequest(request: ManagedRequest): void {
    this.requestQueue.push(request);
    // Sort by priority (higher first)
    this.requestQueue.sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  private async waitForSlot(request: ManagedRequest): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkSlot = () => {
        if (!this.shouldQueue(request)) {
          // Remove from queue
          const index = this.requestQueue.indexOf(request);
          if (index > -1) {
            this.requestQueue.splice(index, 1);
          }
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };

      checkSlot();
    });
  }

  private completeRequest(requestId: string): void {
    const request = this.requests.get(requestId);
    if (request) {
      // Decrement active counts for tags
      for (const tag of request.metadata.tags) {
        const currentCount = this.activeCounts.get(tag) || 0;
        this.activeCounts.set(tag, Math.max(0, currentCount - 1));
      }

      this.processQueue();
    }
  }

  private processQueue(): void {
    // Try to process queued requests
    const processableRequests = this.requestQueue.filter(request => 
      !this.shouldQueue(request)
    );

    for (const request of processableRequests) {
      // Increment active counts for tags
      for (const tag of request.metadata.tags) {
        const currentCount = this.activeCounts.get(tag) || 0;
        this.activeCounts.set(tag, currentCount + 1);
      }
    }
  }
}

// Global request manager instance
export const requestManager = new RequestManager();

/**
 * Utility function for creating managed requests
 */
export async function createManagedRequest<T>(
  url: string,
  method: string,
  operation: (signal: AbortSignal) => Promise<T>,
  options?: RequestOptions
): Promise<T> {
  return requestManager.createRequest(url, method, operation, options);
}

/**
 * React Hook for request management
 */
export function useRequestManager() {
  return {
    createRequest: requestManager.createRequest.bind(requestManager),
    cancelRequest: requestManager.cancelRequest.bind(requestManager),
    cancelRequestsByTag: requestManager.cancelRequestsByTag.bind(requestManager),
    getStatistics: requestManager.getStatistics.bind(requestManager)
  };
}