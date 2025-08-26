import { z } from 'zod';

export const AccountQueryDto = z.object({
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
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  role: z.enum(['admin', 'approver', 'staff', 'viewer']).optional(),
  keyword: z.string().optional(),
});

export type AccountQueryInput = z.infer<typeof AccountQueryDto>;