import { z } from 'zod';

export const ApprovalQueryDto = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('1'),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .default('20'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  requesterId: z.string().optional(),
  approverId: z.string().optional(),
});

export type ApprovalQueryInput = z.infer<typeof ApprovalQueryDto>;