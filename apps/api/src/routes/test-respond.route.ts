import { Router, Request } from 'express';
import { respond, respondWithETag, createResponse } from '../middleware/respond';
import { z } from 'zod';

// Test schema
const TestResponseSchema = z.object({
  data: z.object({
    message: z.string(),
    timestamp: z.string(),
    version: z.number()
  })
});

const r: Router = Router();

// Test basic respond middleware
r.get('/basic', respond(TestResponseSchema, async (req: Request) => {
  return createResponse({
    message: 'Hello from respond middleware',
    timestamp: new Date().toISOString(),
    version: 1
  });
}));

// Test respondWithETag middleware
r.get('/etag', respondWithETag(
  TestResponseSchema,
  async (req: Request) => {
    return createResponse({
      message: 'Hello from ETag respond middleware',
      timestamp: new Date().toISOString(),
      version: 2
    });
  },
  (result) => result.data.version
));

export default r;