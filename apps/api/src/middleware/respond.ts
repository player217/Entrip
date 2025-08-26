import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Response wrapper interface
export interface ApiResponse<T = any> {
  data: T;
  meta?: {
    nextCursor?: string | null;
    previousCursor?: string | null;
    limit?: number;
    total?: number;
    page?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

// Helper to create standardized responses
export const createResponse = <T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> => {
  const response: ApiResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return response;
};

// Standard response middleware with schema validation
export const respond = <T>(
  responseSchema: ZodSchema<ApiResponse<T>>,
  handler: (req: Request) => Promise<ApiResponse<T>>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req);
      
      // Validate response in development
      if (process.env.NODE_ENV !== 'production') {
        try {
          responseSchema.parse(result);
        } catch (validationError) {
          console.warn('Response validation failed:', validationError);
          // In development, still send response but log the issue
        }
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
};

// Response middleware with ETag support for caching
export const respondWithETag = <T>(
  responseSchema: ZodSchema<ApiResponse<T>>,
  handler: (req: Request) => Promise<ApiResponse<T>>,
  generateEtag: (result: ApiResponse<T>) => string | number
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req);
      
      // Validate response in development
      if (process.env.NODE_ENV !== 'production') {
        try {
          responseSchema.parse(result);
        } catch (validationError) {
          console.warn('Response validation failed:', validationError);
        }
      }
      
      // Generate ETag
      const etag = `"${generateEtag(result)}"`;
      
      // Check If-None-Match for 304 Not Modified
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch === etag) {
        res.status(304).end();
        return;
      }
      
      // Set ETag header and send response
      res.set('ETag', etag);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
};

// No content response for DELETE operations
export const respondNoContent = (
  handler: (req: Request) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
};

// Response middleware for created resources (201)
export const respondCreated = <T>(
  responseSchema: ZodSchema<ApiResponse<T>>,
  handler: (req: Request) => Promise<ApiResponse<T>>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req);
      
      // Validate response in development
      if (process.env.NODE_ENV !== 'production') {
        try {
          responseSchema.parse(result);
        } catch (validationError) {
          console.warn('Response validation failed:', validationError);
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
};