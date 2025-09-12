import { z } from 'zod';

export const FinanceUpdateDto = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().min(1).max(50).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .toUpperCase()
    .optional(),
  exchangeRate: z.number().positive().optional(),
  occurredAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
  description: z.string().max(500).nullable().optional(),
  accountId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'deleted']).optional(),
});

export type FinanceUpdateInput = z.infer<typeof FinanceUpdateDto>;