import { z } from 'zod';

export const CalendarQueryDto = z.object({
  year: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().int().min(2000).max(2100)
  ),
  month: z.string().transform(val => parseInt(val, 10)).pipe(
    z.number().int().min(1).max(12)
  ),
  team: z.string().optional(),
});

export type CalendarQueryInput = z.infer<typeof CalendarQueryDto>;