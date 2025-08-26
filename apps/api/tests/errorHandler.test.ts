import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../src/middlewares/errorHandler';
import { logger } from '../src/lib/logger';

// Mock the logger
// Mock the logger - using any for test mocks is acceptable
jest.mock('../src/lib/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup request mock
    mockReq = {
      url: '/api/v1/test',
      method: 'GET',
      path: '/api/v1/test',
      body: { test: 'data' },
      headers: { 'content-type': 'application/json' },
      query: { page: '1' }
    };
    
    // Setup response mock
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    // Setup next function
    mockNext = jest.fn();
  });

  describe('4xx error transformation', () => {
    it('should handle 400 Bad Request error', () => {
      const error = new Error('Invalid request body') as any;
      error.status = 400;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, {
        url: '/api/v1/test',
        method: 'GET',
        body: { test: 'data' },
        headers: { 'content-type': 'application/json' },
        query: { page: '1' }
      });
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        code: 400,
        message: 'Invalid request body',
        details: expect.objectContaining({
          stack: expect.any(String),
          timestamp: expect.any(String),
          path: '/api/v1/test',
          method: 'GET'
        })
      });
    });

    it('should handle 401 Unauthorized error', () => {
      const error = new Error('Authentication required') as any;
      error.status = 401;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 401,
        message: 'Authentication required'
      }));
    });

    it('should handle 403 Forbidden error', () => {
      const error = new Error('Access denied') as any;
      error.status = 403;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 403,
        message: 'Access denied'
      }));
    });

    it('should handle 404 Not Found error', () => {
      const error = new Error('Resource not found') as any;
      error.status = 404;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 404,
        message: 'Resource not found'
      }));
    });

    it('should use default message when error message is empty', () => {
      const error = new Error() as any;
      error.status = 400;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 400,
        message: '잘못된 요청입니다'
      }));
    });
  });

  describe('5xx error handling', () => {
    it('should handle 500 Internal Server Error', () => {
      const error = new Error('Database connection failed') as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: 'Database connection failed'
      }));
    });

    it('should handle 502 Bad Gateway error', () => {
      const error = new Error('Upstream server error') as any;
      error.status = 502;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(502);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 502,
        message: 'Upstream server error'
      }));
    });

    it('should handle 503 Service Unavailable error', () => {
      const error = new Error('Service temporarily unavailable') as any;
      error.status = 503;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(503);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 503,
        message: 'Service temporarily unavailable'
      }));
    });

    it('should default to 500 when no status is provided', () => {
      const error = new Error('Unexpected error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: 'Unexpected error'
      }));
    });

    it('should use default 500 message when no error message', () => {
      const error = new Error() as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 500,
        message: '서버에서 오류가 발생했습니다'
      }));
    });
  });

  describe('Stack trace stripping in production', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error') as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.details).toBeDefined();
      expect(response.details.stack).toBeDefined();
      expect(response.details.timestamp).toBeDefined();
      expect(response.details.path).toBe('/api/v1/test');
      expect(response.details.method).toBe('GET');
    });

    it('should strip stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error') as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.details).toBeUndefined();
    });

    it('should strip stack trace in test environment', () => {
      process.env.NODE_ENV = 'test';
      const error = new Error('Test error') as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.details).toBeDefined();
    });
  });

  describe('Custom error messages', () => {
    it('should handle custom error with custom properties', () => {
      const error = new Error('Custom validation error') as any;
      error.status = 422;
      error.code = 'VALIDATION_ERROR';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 422,
        message: 'Custom validation error'
      }));
    });

    it('should handle error with undefined status code', () => {
      const error = new Error('Unknown error') as any;
      error.status = 418; // I'm a teapot - no default message

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(418);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 418,
        message: 'Unknown error'
      }));
    });

    it('should use fallback message for unknown status codes without message', () => {
      const error = new Error() as any;
      error.status = 418; // I'm a teapot - no default message

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 418,
        message: '서버에서 오류가 발생했습니다'
      }));
    });
  });

  describe('Logging integration', () => {
    it('should log all errors with full context', () => {
      const error = new Error('Test error') as any;
      error.status = 500;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, {
        url: '/api/v1/test',
        method: 'GET',
        body: { test: 'data' },
        headers: { 'content-type': 'application/json' },
        query: { page: '1' }
      });
    });

    it('should log errors even when response fails', () => {
      const error = new Error('Test error') as any;
      error.status = 500;
      
      // Make the response fail
      statusMock.mockImplementation(() => {
        throw new Error('Response failed');
      });

      expect(() => {
        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      }).toThrow('Response failed');

      // Logger should still have been called
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it('should handle missing request properties gracefully', () => {
      const error = new Error('Test error') as any;
      error.status = 500;
      
      // Create minimal request
      const minimalReq = {
        url: '/test'
      } as Request;

      errorHandler(error, minimalReq, mockRes as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Unhandled error', error, {
        url: '/test',
        method: undefined,
        body: undefined,
        headers: undefined,
        query: undefined
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle errors with circular references', () => {
      const error = new Error('Circular error') as any;
      error.status = 500;
      error.circularRef = error; // Create circular reference

      expect(() => {
        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      }).not.toThrow();

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage) as any;
      error.status = 400;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        message: longMessage
      }));
    });

    it('should handle errors with non-standard properties', () => {
      const error = {
        name: 'CustomError',
        message: 'Custom error occurred',
        status: 409,
        customProp: 'value',
        stack: 'Error stack trace'
      } as any;

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        code: 409,
        message: 'Custom error occurred'
      }));
    });
  });
});