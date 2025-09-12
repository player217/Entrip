import { z } from 'zod';

export const ApprovalActionDto = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().max(500).optional(),
});

export type ApprovalActionInput = z.infer<typeof ApprovalActionDto>;