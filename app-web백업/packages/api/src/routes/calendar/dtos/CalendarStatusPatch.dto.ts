import { z } from 'zod';

export const CalendarStatusPatchDto = z.object({
  status: z.enum(['confirmed', 'pending', 'cancelled']),
  notes: z.string().optional(),
});

export type CalendarStatusPatchInput = z.infer<typeof CalendarStatusPatchDto>;