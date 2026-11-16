import { z } from 'zod';
export const BookingStatusPatchDto = z.object({
  status: z.preprocess(value => typeof value === 'string' ? value.toUpperCase() : value, z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])),
  notes: z.string().max(20000).optional(),
});
export type BookingStatusPatchInput = z.infer<typeof BookingStatusPatchDto>;
