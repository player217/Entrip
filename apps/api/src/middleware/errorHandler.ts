import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  
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