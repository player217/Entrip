import { z } from 'zod';

export const ApprovalUpdateDto = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(2000).optional(),
  steps: z.array(
    z.object({
      approverId: z.string().min(1),
      order: z.number().int().min(0),
    })
  ).min(1).optional(),
  // Only allow pending → cancelled status change
  status: z.enum(['cancelled']).optional(),
});

export type ApprovalUpdateInput = z.infer<typeof ApprovalUpdateDto>;