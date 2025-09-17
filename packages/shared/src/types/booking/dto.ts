import { z } from 'zod';

/**
 * Booking DTO 스키마 - Single Source of Truth
 * 모든 Booking 관련 타입의 기준이 되는 Zod 스키마
 */

// BookingStatus enum
export const BookingStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

// BookingType enum
export const BookingTypeSchema = z.enum([
  'PACKAGE',
  'CUSTOM',
  'INCENTIVE',
  'FIT',
  'GROUP'
]);
export type BookingType = z.infer<typeof BookingTypeSchema>;

// UserRole enum
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'USER']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Main BookingDTO Schema
export const BookingDTOSchema = z.object({
  // 기본 식별 정보
  id: z.string(),
  bookingNumber: z.string(),
  companyCode: z.string(),
  
  // 고객 정보
  customerName: z.string(),
  teamName: z.string().optional(),
  representative: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email().optional(),
  
  // 여행 정보
  destination: z.string().nullable(),
  startDate: z.string(), // ISO date string
  endDate: z.string().nullable(),
  departureTime: z.string().optional(),
  returnTime: z.string().optional(),
  
  // 상태 및 타입
  status: BookingStatusSchema,
  bookingType: BookingTypeSchema.optional(),
  
  // 금액 정보
  totalPrice: z.number(),
  depositAmount: z.number().optional(),
  currency: z.string().default('KRW'),
  
  // 인원 정보
  paxCount: z.number().default(1),
  adultCount: z.number().optional(),
  childCount: z.number().optional(),
  infantCount: z.number().optional(),
  
  // 담당자 정보
  manager: z.string().optional(),
  managerId: z.string().optional(),
  
  // 상세 정보
  flightInfo: z.any().optional(), // JSON field
  hotelInfo: z.any().optional(),  // JSON field
  notes: z.string().optional(),
  
  // 시스템 필드
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().default(1),
});

// 타입 추론
export type BookingDTO = z.infer<typeof BookingDTOSchema>;

// 부분 업데이트용 스키마
export const BookingUpdateSchema = BookingDTOSchema.partial().omit({
  id: true,
  bookingNumber: true,
  companyCode: true,
  createdAt: true,
});
export type BookingUpdateDTO = z.infer<typeof BookingUpdateSchema>;

// 생성용 스키마
export const BookingCreateSchema = BookingDTOSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});
export type BookingCreateDTO = z.infer<typeof BookingCreateSchema>;

// 검증 함수
export function validateBookingDTO(data: unknown): BookingDTO {
  return BookingDTOSchema.parse(data);
}

export function validateBookingUpdate(data: unknown): BookingUpdateDTO {
  return BookingUpdateSchema.parse(data);
}

export function validateBookingCreate(data: unknown): BookingCreateDTO {
  return BookingCreateSchema.parse(data);
}

// 타입 가드
export function isBookingDTO(data: unknown): data is BookingDTO {
  try {
    BookingDTOSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}