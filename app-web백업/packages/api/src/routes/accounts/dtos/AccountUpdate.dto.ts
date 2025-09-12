import { z } from 'zod';

export const AccountUpdateDto = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string()
    .regex(/^01[0-9]{8,9}$/, 'Invalid phone number')
    .nullable()
    .optional(),
  role: z.enum(['admin', 'approver', 'staff', 'viewer']).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

export type AccountUpdateInput = z.infer<typeof AccountUpdateDto>;