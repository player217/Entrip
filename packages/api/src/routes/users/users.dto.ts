import { z } from 'zod';
import { UserRole } from '@prisma/client';

// Create user validation
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    password: z.string().min(6).max(100),
    role: z.nativeEnum(UserRole).optional(),
    department: z.string().max(100).optional(),
  }),
});

// Update user validation
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    role: z.nativeEnum(UserRole).optional(),
    department: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
  }),
});

// Update password validation
export const updatePasswordSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6).max(100),
  }),
});

// Reset password validation (admin only)
export const resetPasswordSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    newPassword: z.string().min(6).max(100),
  }),
});

// Get users query validation
export const getUsersQuerySchema = z.object({
  query: z.object({
    role: z.nativeEnum(UserRole).optional(),
    department: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sortBy: z.enum(['name', 'email', 'role', 'department', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

// Get user by ID validation
export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

// Get users by department validation
export const getUsersByDepartmentSchema = z.object({
  params: z.object({
    department: z.string(),
  }),
});

// Bulk create users validation
export const bulkCreateUsersSchema = z.object({
  body: z.object({
    users: z.array(z.object({
      email: z.string().email(),
      name: z.string().min(2).max(100),
      password: z.string().min(6).max(100),
      role: z.nativeEnum(UserRole).optional(),
      department: z.string().max(100).optional(),
    })).min(1),
  }),
});

// Types for use in controllers
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>['query'];
export type BulkCreateUsersInput = z.infer<typeof bulkCreateUsersSchema>['body'];