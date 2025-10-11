import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = (req.headers['x-request-id'] as string) || undefined;
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

