import { Request, Response, NextFunction } from 'express';
import { ApiError } from './api-error';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return res.status(error.http).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details || null,
        traceId: req.get('x-request-id') || null
      }
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  if (error.code === 'P2002') { // Prisma unique constraint
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error'
  });
};