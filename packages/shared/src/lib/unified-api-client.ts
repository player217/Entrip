import axios, { 
  AxiosInstance, 
  AxiosError, 
  AxiosRequestConfig,
  InternalAxiosRequestConfig 
} from 'axios';

// Extend InternalAxiosRequestConfig to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
      requestId: string;
      priority?: number;
      tags?: string[];
      circuitBreakerName?: string;
    };
  }
}

// Enhanced Error Handling System
import { ApiError, ErrorClassifier, ErrorCategory, ErrorSeverity } from './error-handling/ApiError';
import { RetryEngine, RetryConfigs, RetryConfig } from './error-handling/RetryEngine';
import { circuitBreakerManager } from './error-handling/CircuitBreaker';
import { requestManager, RequestOptions } from './error-handling/RequestManager';

export interface ApiClientConfig {
  onUnauthorized?: () => void;
  onNetworkError?: (error: Error) => void;
  onApiError?: (error: ApiError) => void;
  enableRetry?: boolean;
  enableCircuitBreaker?: boolean;
  enableRequestManagement?: boolean;
  retryConfig?: Partial<RetryConfig>;
  defaultTimeout?: number;
  globalConcurrencyLimit?: number;
}

// TypeScript 타입 안전성 개선
interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

export interface EnhancedRequestConfig extends AxiosRequestConfig {
  // Error handling options
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
  skipRequestManagement?: boolean;
  retryConfig?: Partial<RetryConfig>;
  
  // Request management options
  priority?: number;
  tags?: string[];
  concurrencyGroup?: string;
  
  // Circuit breaker options
  circuitBreakerName?: string;
}

class UnifiedApiClient {
  private axiosInstance: AxiosInstance;
  private defaultRetryEngine: RetryEngine;
  
  constructor(private config: ApiClientConfig = {}) {
    // Set default configuration
    const defaultConfig: Required<ApiClientConfig> = {
      onUnauthorized: () => {},
      onNetworkError: () => {},
      onApiError: () => {},
      enableRetry: true,
      enableCircuitBreaker: true,
      enableRequestManagement: true,
      retryConfig: RetryConfigs.CONSERVATIVE,
      defaultTimeout: 30000,
      globalConcurrencyLimit: 10,
      ...config
    };
    
    this.config = defaultConfig;

    // Initialize request manager
    if (defaultConfig.enableRequestManagement) {
      requestManager.setGlobalConcurrencyLimit(defaultConfig.globalConcurrencyLimit);
    }

    // Initialize default retry engine
    this.defaultRetryEngine = new RetryEngine(defaultConfig.retryConfig);

    this.axiosInstance = axios.create({
      baseURL: '/',
      withCredentials: true,
      timeout: defaultConfig.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor - Enhanced request processing
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add request ID for tracking
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (config.headers) {
          config.headers['x-request-id'] = requestId;
        }

        // Add timestamp for performance monitoring
        config.metadata = {
          ...config.metadata,
          startTime: Date.now(),
          requestId
        };

        return config;
      },
      (error: AxiosError) => {
        const apiError = ErrorClassifier.classify(error);
        this.config.onApiError?.(apiError);
        return Promise.reject(apiError);
      }
    );

    // Response Interceptor - Enhanced error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Add response timing
        if (response.config.metadata?.startTime) {
          const duration = Date.now() - response.config.metadata.startTime;
          response.headers['x-response-time'] = duration.toString();
        }
        return response;
      },
      async (error: AxiosError<ApiErrorResponse>) => {
        // Classify the error using our enhanced system
        const context = {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          requestId: error.config?.headers?.['x-request-id'] as string,
          timestamp: Date.now()
        };

        const apiError = ErrorClassifier.classify(error, context);

        // Handle specific error types
        if (apiError.statusCode === 401) {
          await this.handleUnauthorized();
        } else if (apiError.category === ErrorCategory.NETWORK) {
          this.config.onNetworkError?.(apiError);
        }

        // Always call error callback
        this.config.onApiError?.(apiError);
        
        return Promise.reject(apiError);
      }
    );
  }

  private async handleUnauthorized(): Promise<void> {
    if (typeof window !== 'undefined') {
      // 로컬 상태만 정리
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // 콜백 호출 (선택적)
      this.config.onUnauthorized?.();
      
      // 리다이렉트 하지 않음 - middleware.ts가 처리
    }
  }

  // Enhanced HTTP methods with comprehensive error handling
  async get<T>(url: string, config?: EnhancedRequestConfig): Promise<T> {
    return this.executeRequest<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: EnhancedRequestConfig): Promise<T> {
    return this.executeRequest<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: EnhancedRequestConfig): Promise<T> {
    return this.executeRequest<T>('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: unknown, config?: EnhancedRequestConfig): Promise<T> {
    return this.executeRequest<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: EnhancedRequestConfig): Promise<T> {
    return this.executeRequest<T>('DELETE', url, undefined, config);
  }

  /**
   * Core request execution with all error handling features
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: unknown,
    config: EnhancedRequestConfig = {}
  ): Promise<T> {
    const {
      skipRetry = false,
      skipCircuitBreaker = false,
      skipRequestManagement = false,
      retryConfig,
      priority = 0,
      tags = [],
      concurrencyGroup,
      circuitBreakerName,
      ...axiosConfig
    } = config;

    // Create the core axios operation
    const operation = async (signal?: AbortSignal): Promise<T> => {
      const requestConfig = {
        ...axiosConfig,
        signal,
        method: method.toLowerCase(),
        url,
        data
      };

      const response = await this.axiosInstance.request<T>(requestConfig);
      return response.data;
    };

    // Wrap with request management if enabled
    if (!skipRequestManagement && this.config.enableRequestManagement) {
      const requestOptions: RequestOptions = {
        priority,
        tags: [...tags, method, concurrencyGroup].filter(Boolean) as string[],
        timeout: axiosConfig.timeout || this.config.defaultTimeout
      };

      return requestManager.createRequest(
        url,
        method,
        operation,
        requestOptions
      );
    }

    // Wrap with circuit breaker if enabled
    if (!skipCircuitBreaker && this.config.enableCircuitBreaker) {
      const serviceName = circuitBreakerName || this.extractServiceName(url);
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
      
      const circuitBreakerOperation = async (): Promise<T> => {
        return circuitBreaker.execute(operation);
      };

      // Apply retry if enabled
      if (!skipRetry && this.config.enableRetry) {
        const retryEngine = retryConfig 
          ? new RetryEngine({ ...this.config.retryConfig, ...retryConfig })
          : this.defaultRetryEngine;

        const result = await retryEngine.execute(circuitBreakerOperation, { url, method });
        if (result.success) {
          return result.data!;
        } else {
          throw result.error;
        }
      }

      return circuitBreakerOperation();
    }

    // Apply retry if enabled (without circuit breaker)
    if (!skipRetry && this.config.enableRetry) {
      const retryEngine = retryConfig 
        ? new RetryEngine({ ...this.config.retryConfig, ...retryConfig })
        : this.defaultRetryEngine;

      const result = await retryEngine.execute(operation, { url, method });
      if (result.success) {
        return result.data!;
      } else {
        throw result.error;
      }
    }

    // Execute directly without any enhancements
    return operation();
  }

  /**
   * Extract service name from URL for circuit breaker identification
   */
  private extractServiceName(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length > 1) {
        return `${pathSegments[0]}-${pathSegments[1]}`;
      } else if (pathSegments.length === 1) {
        return pathSegments[0] ?? 'default';
      } else {
        return 'default';
      }
    } catch {
      return 'default';
    }
  }

  /**
   * Get API client metrics and statistics
   */
  getMetrics() {
    return {
      requestManager: this.config.enableRequestManagement 
        ? requestManager.getStatistics() 
        : null,
      circuitBreakers: this.config.enableCircuitBreaker 
        ? circuitBreakerManager.getAllMetrics() 
        : null,
      configuration: {
        enableRetry: this.config.enableRetry,
        enableCircuitBreaker: this.config.enableCircuitBreaker,
        enableRequestManagement: this.config.enableRequestManagement,
        defaultTimeout: this.config.defaultTimeout,
        globalConcurrencyLimit: this.config.globalConcurrencyLimit
      }
    };
  }

  /**
   * Cleanup resources and cancel pending requests
   */
  cleanup(): void {
    if (this.config.enableRequestManagement) {
      requestManager.cancelAllRequests('API client cleanup');
      requestManager.cleanup();
    }

    if (this.config.enableCircuitBreaker) {
      circuitBreakerManager.resetAll();
    }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.globalConcurrencyLimit && this.config.enableRequestManagement) {
      requestManager.setGlobalConcurrencyLimit(newConfig.globalConcurrencyLimit);
    }

    if (newConfig.retryConfig) {
      this.defaultRetryEngine = new RetryEngine({ ...this.config.retryConfig });
    }
  }

  /**
   * Get the underlying axios instance for backward compatibility
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiClient = new UnifiedApiClient();

// 기존 코드 호환성을 위한 내보내기
export default apiClient;