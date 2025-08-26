import { z } from 'zod';
import { BookingStatus, BookingType } from '@prisma/client';

// Create Booking DTO
export const CreateBookingDtoSchema = z.object({
  customerName: z.string().min(1, '고객명은 필수입니다'),
  teamName: z.string().min(1, '팀명은 필수입니다'),
  bookingType: z.nativeEnum(BookingType),
  destination: z.string().min(1, '목적지는 필수입니다'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  paxCount: z.number().int().positive('인원수는 1명 이상이어야 합니다'),
  nights: z.number().int().min(0),
  days: z.number().int().positive(),
  totalPrice: z.number().positive('총 금액은 0보다 커야 합니다'),
  depositAmount: z.number().optional(),
  currency: z.string().default('KRW'),
  flightInfo: z.record(z.unknown()).optional(),
  hotelInfo: z.record(z.unknown()).optional(),
  insuranceInfo: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingDtoSchema>;

// Update Booking DTO
export const UpdateBookingDtoSchema = CreateBookingDtoSchema.partial().extend({
  status: z.nativeEnum(BookingStatus).optional(),
});

export type UpdateBookingDto = z.infer<typeof UpdateBookingDtoSchema>;

// Create Booking Event DTO
export const CreateBookingEventDtoSchema = z.object({
  date: z.string().datetime(),
  typeCode: z.enum(['GF', 'IN', 'HM', 'AT']),
  status: z.nativeEnum(BookingStatus),
});

export type CreateBookingEventDto = z.infer<typeof CreateBookingEventDtoSchema>;

// List Bookings Query DTO
export const ListBookingsQueryDtoSchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ListBookingsQueryDto = z.infer<typeof ListBookingsQueryDtoSchema>;

// Booking Response DTO
export const BookingResponseDtoSchema = z.object({
  id: z.string(),
  bookingNumber: z.string(),
  customerName: z.string(),
  teamName: z.string(),
  bookingType: z.nativeEnum(BookingType),
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  paxCount: z.number(),
  nights: z.number(),
  days: z.number(),
  status: z.nativeEnum(BookingStatus),
  totalPrice: z.number(),
  depositAmount: z.number().nullable(),
  currency: z.string(),
  flightInfo: z.any().nullable(),
  hotelInfo: z.any().nullable(),
  insuranceInfo: z.any().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  events: z.array(z.object({
    id: z.string(),
    date: z.string(),
    typeCode: z.string(),
    status: z.nativeEnum(BookingStatus),
  })).optional(),
});

export type BookingResponseDto = z.infer<typeof BookingResponseDtoSchema>;