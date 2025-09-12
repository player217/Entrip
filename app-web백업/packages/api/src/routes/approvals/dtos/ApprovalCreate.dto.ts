import { z } from 'zod';

export const ApprovalCreateDto = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(2000),
  targetType: z.enum(['finance', 'custom']),
  targetId: z.string().optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter ISO 4217 code')
    .toUpperCase()
    .default('KRW'),
  steps: z.array(
    z.object({
      approverId: z.string().min(1, 'Approver ID is required'),
      order: z.number().int().min(0),
    })
  ).min(1, 'At least one approver is required'),
});

export type ApprovalCreateInput = z.infer<typeof ApprovalCreateDto>;