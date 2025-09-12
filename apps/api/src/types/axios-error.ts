/**
 * Custom axios error type definition for proper error handling
 */
export interface AxiosError extends Error {
  response?: {
    status: number;
    statusText?: string;
    data?: any;
    headers?: Record<string, any>;
  };
  request?: any;
  code?: string;
  config?: {
    url?: string;
    method?: string;
    data?: any;
    headers?: Record<string, any>;
  };
  isAxiosError?: boolean;
}

/**
 * Type guard to check if an error is an AxiosError
 */
export function isAxiosError(error: any): error is AxiosError {
  return error && error.isAxiosError === true;
}

/**
 * Helper to safely get response status from an error
 */
export function getErrorStatus(error: any): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  return undefined;
}

/**
 * Helper to safely get response data from an error
 */
export function getErrorData(error: any): any {
  if (isAxiosError(error)) {
    return error.response?.data;
  }
  return undefined;
}

/**
 * Helper to safely get error code from an error
 */
export function getErrorCode(error: any): string | undefined {
  if (isAxiosError(error)) {
    return error.code;
  }
  return undefined;
}