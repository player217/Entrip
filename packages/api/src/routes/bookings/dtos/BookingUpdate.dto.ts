import { z } from 'zod';
import { BookingCreateDto } from './BookingCreate.dto';

export const BookingUpdateDto = BookingCreateDto.partial();

export type BookingUpdateInput = z.infer<typeof BookingUpdateDto>;