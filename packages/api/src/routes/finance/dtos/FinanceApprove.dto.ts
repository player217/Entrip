import { z } from 'zod';

export const FinanceApproveDto = z.object({
  status: z.enum(['approved', 'rejected']),
  remarks: z.string().max(500).optional(),
});

export type FinanceApproveInput = z.infer<typeof FinanceApproveDto>;