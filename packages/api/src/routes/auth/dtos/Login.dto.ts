import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyCode: z.string().min(1, 'companyCode is required'),
});

export type LoginInput = z.infer<typeof LoginDto>;
