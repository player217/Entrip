import { Request, Response, NextFunction } from 'express';
import { errorHandler, ApiError } from '../error.middleware';
import { ZodError } from 'zod';

describe('Error Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('ApiError handling', () => {
    it('should handle ApiError with custom status code', () => {
      const error = new ApiError(404, 'Not Found');
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not Found',
        errors: null,
      });
    });

    it('should handle ApiError with 400 status', () => {
      const error = new ApiError(400, 'Bad Request');
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad Request',
        errors: null,
      });
    });
  });

  describe('ZodError handling', () => {
    it('should handle ZodError with validation details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ]);
      
      errorHandler(zodError, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation Error',
        errors: zodError.errors,
      });
    });
  });

  describe('Generic Error handling', () => {
    it('should handle generic Error', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong',
        errors: null,
      });
    });

    it('should handle unknown error types', () => {
      const error = { weird: 'object' };
      
      errorHandler(error as Error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error',
        errors: null,
      });
    });
  });

  describe('Development mode', () => {
    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n    at Test...';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dev error',
        errors: null,
        stack: error.stack,
      });
      expect(consoleSpy).toHaveBeenCalledWith(error);
      
      consoleSpy.mockRestore();
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Prod error');
      error.stack = 'Error: Prod error\n    at Test...';
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Prod error',
        errors: null,
      });
    });
  });
});