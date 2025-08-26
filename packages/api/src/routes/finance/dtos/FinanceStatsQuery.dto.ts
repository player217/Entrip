import { z } from 'zod';

export const FinanceStatsQueryDto = z.object({
  year: z.string()
    .regex(/^\d{4}$/, 'Year must be 4 digits')
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 2000 && val <= 2100, {
      message: 'Year must be between 2000 and 2100',
    }),
  month: z.string()
    .regex(/^\d{1,2}$/, 'Month must be 1-2 digits')
    .transform(val => parseInt(val, 10))
    .refine(val => val >= 1 && val <= 12, {
      message: 'Month must be between 1 and 12',
    })
    .optional(),
});

export type FinanceStatsQueryInput = z.infer<typeof FinanceStatsQueryDto>;