import { z } from 'zod';

export const FinanceCreateDto = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required').max(50),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .toUpperCase()
    .default('KRW'),
  exchangeRate: z.number().positive().default(1),
  occurredAt: z.string().datetime({ message: 'Invalid datetime format' }),
  description: z.string().max(500).optional(),
  accountId: z.string().optional(),
  projectId: z.string().optional(),
});

export type FinanceCreateInput = z.infer<typeof FinanceCreateDto>;