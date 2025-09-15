import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const RegisterDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  department: z.string().min(1, 'Department is required').optional(),
});

export type RegisterInput = z.infer<typeof RegisterDto>;