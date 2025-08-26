import { z } from 'zod';
import { BookingType, BookingStatus } from '@entrip/shared';

const bookingTypes = Object.values(BookingType) as [string, ...string[]];
const bookingStatuses = Object.values(BookingStatus) as [string, ...string[]];

export const createBookingSchema = z.object({
  customerName: z.string().min(1).max(100),
  teamName: z.string().min(1).max(100),
  bookingType: z.enum(bookingTypes),
  destination: z.string().min(1).max(60),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  paxCount: z.number().int().positive(),
  nights: z.number().int().min(0),
  days: z.number().int().min(1),
  totalPrice: z.number().positive(),
  depositAmount: z.number().optional(),
  currency: z.string().default('KRW')
});

export const updateBookingSchema = createBookingSchema.partial();

export const statusSchema = z.object({
  status: z.enum(bookingStatuses)
});