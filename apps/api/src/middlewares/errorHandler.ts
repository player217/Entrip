import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error with context
  logger.error('Unhandled error', err, {
    url: req.url,
    method: req.method,
    body: req.body,
    headers: req.headers,
    query: req.query
  });

  // Determine status code
  const status = err.status || 500;
  
  // Create error response
  const errorResponse = {
    code: status,
    message: err.message || getDefaultMessage(status),
    details: process.env.NODE_ENV !== 'production' ? {
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    } : undefined
  };

  res.status(status).json(errorResponse);
};

/**
 * Get default error message based on status code
 */
function getDefaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: '잘못된 요청입니다',
    401: '인증이 필요합니다',
    403: '접근 권한이 없습니다',
    404: '요청한 리소스를 찾을 수 없습니다',
    500: '서버에서 오류가 발생했습니다',
    502: '게이트웨이 오류가 발생했습니다',
    503: '서비스를 일시적으로 사용할 수 없습니다'
  };

  return messages[status] || '서버에서 오류가 발생했습니다';
}