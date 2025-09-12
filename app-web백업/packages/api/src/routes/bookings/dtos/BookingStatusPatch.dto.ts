import { z } from 'zod';

export const BookingStatusPatchDto = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

export type BookingStatusPatchInput = z.infer<typeof BookingStatusPatchDto>;