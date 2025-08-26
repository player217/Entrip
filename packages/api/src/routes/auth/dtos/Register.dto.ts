import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export type RegisterInput = z.infer<typeof RegisterDto>;