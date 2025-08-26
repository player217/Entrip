import { z } from 'zod';

export const FinanceQueryDto = z.object({
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
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmount: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Min amount must be a number')
    .transform(Number)
    .pipe(z.number().nonnegative())
    .optional(),
  maxAmount: z.string()
    .regex(/^\d+(\.\d+)?$/, 'Max amount must be a number')
    .transform(Number)
    .pipe(z.number().positive())
    .optional(),
  keyword: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'deleted']).optional(),
  accountId: z.string().optional(),
  projectId: z.string().optional(),
});

export type FinanceQueryInput = z.infer<typeof FinanceQueryDto>;