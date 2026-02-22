/**
 * API 표준 에러 클래스 및 타입 정의
 */

// 표준 에러 코드 enum
export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Dependencies
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  UNAVAILABLE = 'UNAVAILABLE',
  
  // Auth
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Data
  INTEGRITY_ERROR = 'INTEGRITY_ERROR',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  
  // Generic
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Precondition
  PRECONDITION_REQUIRED = 'PRECONDITION_REQUIRED',
  PRECONDITION_FAILED = 'PRECONDITION_FAILED',
}

// HTTP 상태 코드 매핑
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 409,
  [ErrorCode.INTEGRITY_ERROR]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DEPENDENCY_FAILED]: 502,
  [ErrorCode.UNAVAILABLE]: 503,
  [ErrorCode.PRECONDITION_REQUIRED]: 428,
  [ErrorCode.PRECONDITION_FAILED]: 412,
};

/**
 * 표준 API 에러 클래스
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly http: number;
  public readonly details?: any;

  constructor(
    code: ErrorCode | string,
    message?: string,
    details?: any,
    httpOverride?: number
  ) {
    const errorCode = code as ErrorCode;
    super(message ?? errorCode);
    this.name = 'ApiError';
    this.code = errorCode;
    this.http = httpOverride ?? ERROR_STATUS_MAP[errorCode] ?? 500;
    this.details = details;
  }

  /**
   * 일반적인 에러 생성 헬퍼 메서드
   */
  static validationError(message: string, details?: any): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static notFound(resource: string): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, `${resource} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError(ErrorCode.CONFLICT, message);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(ErrorCode.AUTH_REQUIRED, message);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, message);
  }

  static rateLimited(retryAfter?: number): ApiError {
    const details = retryAfter ? { retryAfter } : undefined;
    return new ApiError(ErrorCode.RATE_LIMITED, 'Too many requests', details);
  }

  static internal(message = 'Internal server error', details?: any): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message, details);
  }

  static preconditionRequired(message = 'Precondition required'): ApiError {
    return new ApiError(ErrorCode.PRECONDITION_REQUIRED, message);
  }

  static preconditionFailed(message = 'Precondition failed'): ApiError {
    return new ApiError(ErrorCode.PRECONDITION_FAILED, message);
  }
}