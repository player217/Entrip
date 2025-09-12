import { z } from 'zod';

export const CalendarUpdateDto = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  start: z.string().datetime({ message: 'Start must be ISO-8601 datetime' }),
  end: z.string().datetime({ message: 'End must be ISO-8601 datetime' }),
  allDay: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be hex format').optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  teamId: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'cancelled']).default('confirmed'),
}).refine(data => new Date(data.end) >= new Date(data.start), {
  message: 'End date must be after or equal to start date',
  path: ['end'],
});

export type CalendarUpdateInput = z.infer<typeof CalendarUpdateDto>;