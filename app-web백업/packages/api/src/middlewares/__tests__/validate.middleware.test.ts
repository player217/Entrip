import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody } from '../validate.middleware';

describe('Validate Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('validate', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
        age: z.number(),
      }),
      query: z.object({
        page: z.string().optional(),
      }),
      params: z.object({
        id: z.string(),
      }),
    });

    it('should call next when validation passes', async () => {
      req.body = { name: 'John', age: 25 };
      req.query = { page: '1' };
      req.params = { id: '123' };

      await validate(schema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      req.body = { name: 'John' }; // Missing age
      req.params = { id: '123' };

      await validate(schema)(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle non-Zod errors', async () => {
      const errorSchema = z.object({}).refine(() => {
        throw new Error('Unexpected error');
      });

      await validate(errorSchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateBody', () => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    it('should validate and parse body when valid', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      await validateBody(bodySchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 when body validation fails', async () => {
      req.body = {
        email: 'invalid-email',
        password: '123', // Too short
      };

      await validateBody(bodySchema)(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty body', async () => {
      req.body = {};

      await validateBody(bodySchema)(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
      });
    });

    it('should handle non-Zod errors in validateBody', async () => {
      const errorSchema = z.object({}).transform(() => {
        throw new TypeError('Transform error');
      });

      await validateBody(errorSchema)(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(TypeError));
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});