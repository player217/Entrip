import { z } from 'zod';
import { BookingType, BookingStatus } from '@entrip/shared';

const bookingTypes = Object.values(BookingType) as [string, ...string[]];
const bookingStatuses = Object.values(BookingStatus) as [string, ...string[]];

// 항공편 스키마
const flightSchema = z.object({
  airline: z.string().min(1),
  flightNo: z.string().optional(),
  departDate: z.string().optional(),
  departureTime: z.string().min(1),
  arriveDate: z.string().optional(),
  arrivalTime: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  note: z.string().optional(),
});

// 차량 스키마
const vehicleSchema = z.object({
  vendor: z.string().optional(),
  type: z.string().min(1),
  count: z.number().optional(),
  passengers: z.number().min(1),
  duration: z.string().min(1),
  route: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  returnDate: z.string().optional(),
  returnTime: z.string().optional(),
  driver: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});

// 호텔 스키마
const hotelSchema = z.object({
  name: z.string().min(1),
  roomType: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  nights: z.number().optional(),
  breakfast: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});

// 정산 스키마
const settlementSchema = z.object({
  type: z.enum(['income', 'expense']),
  currency: z.string().min(1),
  amount: z.number().min(0.01),
  exchangeRate: z.number().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  memo: z.string().optional(),
});

export const createBookingSchema = z.object({
  // 필수 기본 정보
  customerName: z.string().min(1).max(100),
  teamName: z.string().min(1).max(100),
  teamType: z.string().optional(), // QuickBookingModal에서 오는 필드
  bookingType: z.enum(bookingTypes),
  origin: z.string().optional(), // QuickBookingModal 필드
  destination: z.string().min(1).max(60),
  departureDate: z.string().optional(), // QuickBookingModal 필드
  returnDate: z.string().optional(), // QuickBookingModal 필드
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pax: z.number().int().positive().optional(), // QuickBookingModal 필드
  paxCount: z.number().int().positive(),
  nights: z.number().int().min(0),
  days: z.number().int().min(1),
  manager: z.string().optional(), // QuickBookingModal 필드
  totalPrice: z.number().positive(),
  depositAmount: z.number().optional(),
  currency: z.string().default('KRW'),
  
  // 선택 연락처 정보
  representative: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  
  // 복잡한 구조 필드
  flights: z.array(flightSchema).optional(),
  vehicles: z.array(vehicleSchema).optional(),
  hotels: z.array(hotelSchema).optional(),
  settlements: z.array(settlementSchema).optional(),
  
  // 기타
  memo: z.string().max(500).optional(),
  notes: z.string().optional(),
});

export const updateBookingSchema = createBookingSchema.partial();

export const statusSchema = z.object({
  status: z.enum(bookingStatuses)
});