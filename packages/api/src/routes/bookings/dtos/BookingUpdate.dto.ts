import { z } from 'zod';
import { BookingCreateFields } from './BookingCreate.dto';
export const BookingUpdateDto = BookingCreateFields.partial().refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: 'End date must be on or after start date', path: ['endDate'],
});
export type BookingUpdateInput = z.infer<typeof BookingUpdateDto>;
