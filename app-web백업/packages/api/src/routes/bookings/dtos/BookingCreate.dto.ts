import { z } from 'zod';

export const BookingCreateDto = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  type: z.enum(['incentive', 'golf', 'honeymoon', 'airtel', 'workshop', 'reward', 'teambuilding']),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  totalPax: z.number().int().positive('Total pax must be positive'),
  coordinator: z.string().min(1, 'Coordinator is required'),
  revenue: z.number().nonnegative('Revenue cannot be negative').optional(),
  notes: z.string().optional(),
});

export type BookingCreateInput = z.infer<typeof BookingCreateDto>;