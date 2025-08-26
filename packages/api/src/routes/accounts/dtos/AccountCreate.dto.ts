import { z } from 'zod';

export const AccountCreateDto = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  phone: z.string()
    .regex(/^01[0-9]{8,9}$/, 'Invalid phone number (should be 01X-XXXX-XXXX format without hyphens)')
    .optional(),
  role: z.enum(['admin', 'approver', 'staff', 'viewer']),
});

export type AccountCreateInput = z.infer<typeof AccountCreateDto>;