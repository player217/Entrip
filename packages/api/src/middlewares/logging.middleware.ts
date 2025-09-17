import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

interface RequestWithStartTime extends Request {
  startTime?: number;
}

export function loggingMiddleware(req: RequestWithStartTime, res: Response, next: NextFunction): void {
  // Record start time
  req.startTime = Date.now();

  // Extract relevant request information
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'unknown';

  // Log incoming request
  logger.debug('Incoming request', {
    method,
    url: originalUrl,
    ip,
    userAgent,
    contentType: headers['content-type'],
  });

  // Capture the original res.end method
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    // Calculate response time
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    // Get response size
    const contentLength = res.get('content-length') || '0';

    // Log HTTP request/response
    logger.http(method, originalUrl, res.statusCode, duration, {
      ip,
      userAgent,
      responseSize: parseInt(contentLength, 10),
      companyCode: (req as any).companyCode,
      userId: (req as any).user?.id,
    });

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

// Error logging middleware
export function errorLoggingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { method, originalUrl, ip } = req;

  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method,
    url: originalUrl,
    ip,
    statusCode: res.statusCode,
    companyCode: (req as any).companyCode,
    userId: (req as any).user?.id,
  });

  next(error);
}