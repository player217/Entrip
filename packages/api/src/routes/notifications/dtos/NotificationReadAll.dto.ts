import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * DTO for Bulk Read All Notifications
 * Used for PATCH /api/v2/notifications/read-all
 */
export const NotificationReadAllDto = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  beforeDate: z.string().datetime().optional(),
});

export type NotificationReadAllInput = z.infer<typeof NotificationReadAllDto>;

/**
 * Conditions for read-all operation
 */
export interface ReadAllConditions {
  type?: NotificationType;
  priority?: NotificationPriority;
  beforeDate?: Date;
}
