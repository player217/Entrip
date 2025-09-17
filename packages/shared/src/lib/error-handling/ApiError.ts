/**
 * Enhanced API Error System
 * Comprehensive error classification and handling for enterprise-grade applications
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  BUSINESS = 'business',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  url?: string;
  method?: string;
  requestId?: string;
  userId?: string;
  companyCode?: string;
  timestamp: number;
  retryCount?: number;
  userAgent?: string;
  circuitBreakerName?: string;
  cancelReason?: string;
  circuitState?: string;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    isRetryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.severity = severity;
    this.context = {
      timestamp: Date.now(),
      ...context
    };
    this.isRetryable = isRetryable;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Convert error to JSON for logging/monitoring
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      category: this.category,
      severity: this.severity,
      context: this.context,
      isRetryable: this.isRetryable,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.NETWORK:
        return '네트워크 연결에 문제가 있습니다. 다시 시도해주세요.';
      case ErrorCategory.AUTH:
        return '인증이 필요합니다. 다시 로그인해주세요.';
      case ErrorCategory.VALIDATION:
        return '입력하신 정보를 확인해주세요.';
      case ErrorCategory.BUSINESS:
        return this.message; // Business errors should have user-friendly messages
      case ErrorCategory.SERVER:
        return '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      case ErrorCategory.TIMEOUT:
        return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      case ErrorCategory.RATE_LIMIT:
        return '너무 많은 요청을 보내셨습니다. 잠시 후 다시 시도해주세요.';
      default:
        return '예상치 못한 오류가 발생했습니다. 관리자에게 문의해주세요.';
    }
  }

  /**
   * Check if error should be reported to monitoring
   */
  shouldReport(): boolean {
    return this.severity === ErrorSeverity.HIGH || 
           this.severity === ErrorSeverity.CRITICAL;
  }

  /**
   * Create a copy with updated context
   */
  withContext(additionalContext: Partial<ErrorContext>): ApiError {
    return new ApiError(
      this.message,
      this.code,
      this.statusCode,
      this.category,
      this.severity,
      { ...this.context, ...additionalContext },
      this.isRetryable,
      this.originalError
    );
  }
}

/**
 * Error Classification System
 */
export class ErrorClassifier {
  /**
   * Classify an error based on various factors
   */
  static classify(error: unknown, context: Partial<ErrorContext> = {}): ApiError {
    // Already classified
    if (error instanceof ApiError) {
      return error.withContext(context);
    }

    // Axios error
    if (this.isAxiosError(error)) {
      return this.classifyAxiosError(error, context);
    }

    // Network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiError(
        'Network connection failed',
        'NETWORK_ERROR',
        undefined,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        context,
        true,
        error as Error
      );
    }

    // Timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return new ApiError(
        'Request timeout',
        'TIMEOUT_ERROR',
        408,
        ErrorCategory.TIMEOUT,
        ErrorSeverity.MEDIUM,
        context,
        true,
        error
      );
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new ApiError(
      errorMessage,
      'UNKNOWN_ERROR',
      undefined,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      context,
      false,
      error instanceof Error ? error : undefined
    );
  }

  private static isAxiosError(error: any): boolean {
    return error?.isAxiosError === true;
  }

  private static classifyAxiosError(error: any, context: Partial<ErrorContext> = {}): ApiError {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const config = error.config;

    const errorContext = {
      ...context,
      url: config?.url,
      method: config?.method?.toUpperCase(),
      requestId: responseData?.requestId || config?.headers?.['x-request-id']
    };

    // Network errors (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return new ApiError(
          'Request timeout',
          'REQUEST_TIMEOUT',
          408,
          ErrorCategory.TIMEOUT,
          ErrorSeverity.MEDIUM,
          errorContext,
          true,
          error
        );
      }

      return new ApiError(
        'Network error',
        'NETWORK_ERROR',
        undefined,
        ErrorCategory.NETWORK,
        ErrorSeverity.HIGH,
        errorContext,
        true,
        error
      );
    }

    // HTTP status-based classification
    switch (true) {
      case status === 401:
        return new ApiError(
          'Authentication required',
          'AUTH_REQUIRED',
          401,
          ErrorCategory.AUTH,
          ErrorSeverity.HIGH,
          errorContext,
          false,
          error
        );

      case status === 403:
        return new ApiError(
          'Access forbidden',
          'ACCESS_FORBIDDEN',
          403,
          ErrorCategory.AUTH,
          ErrorSeverity.MEDIUM,
          errorContext,
          false,
          error
        );

      case status === 400:
        return new ApiError(
          responseData?.message || 'Invalid request',
          'VALIDATION_ERROR',
          400,
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW,
          errorContext,
          false,
          error
        );

      case status === 422:
        return new ApiError(
          responseData?.message || 'Validation failed',
          'VALIDATION_FAILED',
          422,
          ErrorCategory.VALIDATION,
          ErrorSeverity.LOW,
          errorContext,
          false,
          error
        );

      case status === 429:
        return new ApiError(
          'Rate limit exceeded',
          'RATE_LIMIT_EXCEEDED',
          429,
          ErrorCategory.RATE_LIMIT,
          ErrorSeverity.MEDIUM,
          errorContext,
          true,
          error
        );

      case status === 409:
        return new ApiError(
          responseData?.message || 'Resource conflict',
          'RESOURCE_CONFLICT',
          409,
          ErrorCategory.BUSINESS,
          ErrorSeverity.MEDIUM,
          errorContext,
          false,
          error
        );

      case status >= 500:
        return new ApiError(
          'Server error',
          'SERVER_ERROR',
          status,
          ErrorCategory.SERVER,
          ErrorSeverity.HIGH,
          errorContext,
          true,
          error
        );

      case status >= 400:
        return new ApiError(
          responseData?.message || 'Client error',
          'CLIENT_ERROR',
          status,
          ErrorCategory.BUSINESS,
          ErrorSeverity.MEDIUM,
          errorContext,
          false,
          error
        );

      default:
        return new ApiError(
          'Unexpected response',
          'UNEXPECTED_RESPONSE',
          status,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          errorContext,
          false,
          error
        );
    }
  }
}

/**
 * Common error factory methods
 */
export const ErrorFactory = {
  networkError: (context?: Partial<ErrorContext>) =>
    new ApiError(
      'Network connection failed',
      'NETWORK_ERROR',
      undefined,
      ErrorCategory.NETWORK,
      ErrorSeverity.HIGH,
      context,
      true
    ),

  authRequired: (context?: Partial<ErrorContext>) =>
    new ApiError(
      'Authentication required',
      'AUTH_REQUIRED',
      401,
      ErrorCategory.AUTH,
      ErrorSeverity.HIGH,
      context,
      false
    ),

  validationError: (message: string, context?: Partial<ErrorContext>) =>
    new ApiError(
      message,
      'VALIDATION_ERROR',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      context,
      false
    ),

  businessError: (message: string, code: string, context?: Partial<ErrorContext>) =>
    new ApiError(
      message,
      code,
      400,
      ErrorCategory.BUSINESS,
      ErrorSeverity.MEDIUM,
      context,
      false
    ),

  serverError: (context?: Partial<ErrorContext>) =>
    new ApiError(
      'Internal server error',
      'SERVER_ERROR',
      500,
      ErrorCategory.SERVER,
      ErrorSeverity.HIGH,
      context,
      true
    ),

  timeoutError: (context?: Partial<ErrorContext>) =>
    new ApiError(
      'Request timeout',
      'TIMEOUT_ERROR',
      408,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.MEDIUM,
      context,
      true
    )
};