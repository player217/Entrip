import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * DTO for Notification List Query Parameters
 * Used for GET /api/v2/notifications
 */
export const NotificationListQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  isRead: z.coerce.boolean().optional(),
  orderBy: z.enum(['createdAt', 'priority', 'expiresAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type NotificationListQuery = z.infer<typeof NotificationListQueryDto>;

/**
 * Filters for notification queries
 */
export interface NotificationFilters {
  type?: NotificationType;
  priority?: NotificationPriority;
  isRead?: boolean;
}
