import { z } from 'zod';
import { 
  StatusSchema, 
  FieldPick, 
  IncludePick, 
  ValidationPatterns,
  ErrorMessages 
} from './common.schema';

/**
 * 공통 검증 패턴 재사용
 */
const { phoneRegex, amountRegex, airportCodeRegex } = ValidationPatterns;

/**
 * 통화 enum
 */
export const CurrencyEnum = z.enum(['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP']);

/**
 * 예약 상태 스키마 (공통 스키마 재사용)
 */
export const BookingStatusSchema = StatusSchema;

/**
 * 예약 생성 요청 스키마
 */
export const BookingCreateSchema = {
  body: z.object({
    code: z.string()
      .min(3, 'Code must be at least 3 characters')
      .max(20, 'Code must not exceed 20 characters')
      .regex(/^[A-Z0-9-]+$/, 'Code must contain only uppercase letters, numbers, and hyphens'),
    
    customerName: z.string()
      .min(1, 'Customer name is required')
      .max(100, 'Customer name must not exceed 100 characters'),
    
    customerPhone: z.string()
      .regex(phoneRegex, 'Invalid Korean phone number format'),
    
    customerEmail: z.string()
      .email('Invalid email format')
      .optional(),
    
    itineraryFrom: z.string()
      .length(3, 'Airport code must be exactly 3 characters')
      .regex(airportCodeRegex, 'Invalid airport code format'),
    
    itineraryTo: z.string()
      .length(3, 'Airport code must be exactly 3 characters')
      .regex(airportCodeRegex, 'Invalid airport code format'),
    
    departAt: z.string().datetime({ 
      message: 'Invalid departure datetime format' 
    }),
    
    arriveAt: z.string().datetime({ 
      message: 'Invalid arrival datetime format' 
    }),
    
    currency: CurrencyEnum.default('KRW'),
    
    amount: z.string()
      .regex(amountRegex, 'Amount must be a valid decimal number'),
    
    managerId: z.string().uuid('Invalid manager ID').optional(),
    
    companyCode: z.string()
      .min(2, 'Company code must be at least 2 characters')
      .max(10, 'Company code must not exceed 10 characters')
      .optional(),
    
    notes: z.string().max(1000).optional(),
    
    metadata: z.record(z.string(), z.any()).optional()
  }).refine(data => {
    // 출발 시간이 도착 시간보다 이전이어야 함
    const depart = new Date(data.departAt);
    const arrive = new Date(data.arriveAt);
    return depart < arrive;
  }, {
    message: 'Departure time must be before arrival time',
    path: ['arriveAt']
  }).refine(data => {
    // 출발지와 도착지가 같을 수 없음
    return data.itineraryFrom !== data.itineraryTo;
  }, {
    message: 'Departure and arrival airports must be different',
    path: ['itineraryTo']
  })
};

/**
 * 예약 업데이트 요청 스키마 (부분 업데이트)
 */
export const BookingUpdateSchema = {
  params: z.object({
    id: z.string().uuid('Invalid booking ID')
  }),
  body: z.object({
    customerName: z.string()
      .min(1)
      .max(100)
      .optional(),
    
    customerPhone: z.string()
      .regex(phoneRegex, 'Invalid Korean phone number format')
      .optional(),
    
    customerEmail: z.string()
      .email('Invalid email format')
      .optional()
      .nullable(),
    
    status: BookingStatusSchema.optional(),
    
    amount: z.string()
      .regex(amountRegex, 'Amount must be a valid decimal number')
      .optional(),
    
    currency: CurrencyEnum.optional(),
    
    notes: z.string().max(1000).optional().nullable(),
    
    metadata: z.record(z.string(), z.any()).optional()
  }).partial() // 모든 필드를 선택적으로 만듦
};

/**
 * 예약 목록 조회 요청 스키마
 */
export const BookingListSchema = {
  query: z.object({
    // 페이지네이션
    limit: z.coerce.number()
      .min(1)
      .max(100)
      .default(20)
      .optional(),
    
    offset: z.coerce.number()
      .min(0)
      .default(0)
      .optional(),
    
    cursor: z.string().optional(),
    
    // 정렬
    sort: z.enum(['createdAt', 'departAt', 'amount', 'code'])
      .default('createdAt')
      .optional(),
    
    order: z.enum(['asc', 'desc'])
      .default('desc')
      .optional(),
    
    // 필터
    status: BookingStatusSchema.optional(),
    
    companyCode: z.string().optional(),
    
    managerId: z.string().uuid().optional(),
    
    currency: CurrencyEnum.optional(),
    
    fromDate: z.string().datetime().optional(),
    
    toDate: z.string().datetime().optional(),
    
    search: z.string().max(100).optional(),
    
    // 필드 선택 (화이트리스트 적용)
    fields: FieldPick,
    
    // 관계 포함 (화이트리스트 적용)
    include: IncludePick
  })
};

/**
 * 예약 단건 조회 스키마
 */
export const BookingGetSchema = {
  params: z.object({
    id: z.string().uuid('Invalid booking ID')
  }),
  query: z.object({
    fields: FieldPick,
    include: IncludePick
  }).optional()
};

/**
 * 예약 삭제 스키마
 */
export const BookingDeleteSchema = {
  params: z.object({
    id: z.string().uuid('Invalid booking ID')
  })
};

/**
 * Booking 엔티티 스키마 (응답용)
 */
export const Booking = z.object({
  id: z.string().uuid(),
  code: z.string(),
  amount: z.string(),
  currency: CurrencyEnum,
  status: BookingStatusSchema,
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().email().nullable(),
  itineraryFrom: z.string(),
  itineraryTo: z.string(),
  departAt: z.string().datetime(),
  arriveAt: z.string().datetime(),
  managerId: z.string().uuid().nullable(),
  companyCode: z.string(),
  notes: z.string().nullable(),
  version: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Booking 목록용 스키마 (선택된 필드만)
 */
export const BookingListItem = Booking.pick({
  id: true,
  code: true,
  amount: true,
  currency: true,
  status: true,
  customerName: true,
  itineraryFrom: true,
  itineraryTo: true,
  departAt: true,
  arriveAt: true,
  createdAt: true,
  version: true
});

/**
 * 응답 스키마
 */
export const BookingResponse = z.object({
  data: Booking
});

export const BookingListResponse = z.object({
  data: z.array(BookingListItem),
  meta: z.object({
    nextCursor: z.string().nullable().optional(),
    previousCursor: z.string().nullable().optional(),
    limit: z.number(),
    total: z.number().optional(),
    page: z.number().optional(),
    totalPages: z.number().optional(),
  }).optional()
});

export const BookingCreateResponse = z.object({
  data: Booking
});

export const BookingUpdateResponse = z.object({
  data: Booking
});

/**
 * 상태 변경 응답
 */
export const BookingStatusResponse = z.object({
  data: z.object({
    id: z.string().uuid(),
    status: BookingStatusSchema,
    version: z.number(),
    updatedAt: z.string().datetime()
  })
});

/**
 * 타입 추론을 위한 export
 */
export type BookingCreateDTO = z.infer<typeof BookingCreateSchema.body>;
export type BookingUpdateDTO = z.infer<typeof BookingUpdateSchema.body>;
export type BookingListQuery = z.infer<typeof BookingListSchema.query>;
export type BookingGetParams = z.infer<typeof BookingGetSchema.params>;
export type TBooking = z.infer<typeof Booking>;
export type TBookingResponse = z.infer<typeof BookingResponse>;
export type TBookingListResponse = z.infer<typeof BookingListResponse>;