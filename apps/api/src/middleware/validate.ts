import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationGroup = { 
  body?: ZodSchema; 
  query?: ZodSchema; 
  params?: ZodSchema;
};

export const validate = (schemaOrGroup: ZodSchema | ValidationGroup) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if it's a single ZodSchema
      const isZodSchema = typeof (schemaOrGroup as any)?.parse === 'function';

      if (isZodSchema) {
        // Handle single schema (body validation)
        req.body = (schemaOrGroup as ZodSchema).parse(req.body);
      } else {
        // Handle validation group
        const group = schemaOrGroup as ValidationGroup;
        
        if (group.body) {
          req.body = group.body.parse(req.body);
        }
        if (group.query) {
          req.query = group.query.parse(req.query) as any;
        }
        if (group.params) {
          req.params = group.params.parse(req.params) as any;
        }
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};