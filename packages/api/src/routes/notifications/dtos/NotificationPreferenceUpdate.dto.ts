import { z } from 'zod';

/**
 * DTO for Notification Preference Update
 * Used for PUT /api/v2/notifications/preferences
 */
export const NotificationPreferenceUpdateDto = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  bookingNotifications: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  approvalNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export type NotificationPreferenceUpdateInput = z.infer<typeof NotificationPreferenceUpdateDto>;
