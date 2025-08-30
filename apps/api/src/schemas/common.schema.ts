import { z } from 'zod';

/**
 * 공통 상태 스키마
 */
export const StatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED'
]);

/**
 * HTTP 헤더 스키마
 */
export const IfMatchHeader = z.object({ 
  'if-match': z.string().optional() 
}).passthrough();

export const IfNoneMatchHeader = z.object({ 
  'if-none-match': z.string().optional() 
}).passthrough();

/**
 * 페이징/정렬/필터 스키마
 */
export const CursorQuery = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.string().regex(/^[a-zA-Z0-9_,:]+$/).optional(), // e.g. createdAt:desc,status:asc
});

export const PaginationQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().regex(/^[a-zA-Z0-9_,:]+$/).optional(),
});

/**
 * 필드 선택 화이트리스트
 * - 클라이언트가 요청할 수 있는 필드만 허용
 */
export const FieldPick = z.array(
  z.enum([
    'id',
    'code',
    'amount',
    'currency',
    'status',
    'customerName',
    'customerPhone',
    'customerEmail',
    'itineraryFrom',
    'itineraryTo',
    'departAt',
    'arriveAt',
    'createdAt',
    'updatedAt',
    'version'
  ])
).optional();

/**
 * 관계 포함 화이트리스트
 * - 클라이언트가 포함할 수 있는 관계만 허용
 */
export const IncludePick = z.array(
  z.enum([
    'customer',
    'payments',
    'manager',
    'company',
    'flights',
    'messages'
  ])
).optional();

/**
 * 표준 에러 응답 스키마
 */
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().nullable(),
    traceId: z.string().nullable(),
  })
});

/**
 * 공통 응답 메타데이터
 */
export const ResponseMeta = z.object({
  nextCursor: z.string().nullable().optional(),
  previousCursor: z.string().nullable().optional(),
  limit: z.number().optional(),
  total: z.number().optional(),
  page: z.number().optional(),
  totalPages: z.number().optional(),
});

/**
 * 파라미터 스키마
 */
export const IdParams = z.object({
  id: z.string().uuid('Invalid ID format')
});

export const CodeParams = z.object({
  code: z.string().min(1, 'Code is required')
});

/**
 * 공통 검증 패턴 재사용
 */
export const ValidationPatterns = {
  phoneRegex: /^01[0-9]-?\d{3,4}-?\d{4}$/,
  amountRegex: /^\d+(\.\d{1,2})?$/,
  airportCodeRegex: /^[A-Z]{3}$/,
  uuidRegex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

/**
 * 공통 에러 메시지
 */
export const ErrorMessages = {
  PHONE_INVALID: 'Invalid Korean phone number format (01X-XXXX-XXXX)',
  AMOUNT_INVALID: 'Amount must be a valid decimal number',
  AIRPORT_INVALID: 'Airport code must be exactly 3 uppercase letters',
  UUID_INVALID: 'Invalid UUID format',
  STATUS_INVALID: 'Invalid status value'
};

/**
 * 타입 추론을 위한 export
 */
export type TErrorResponse = z.infer<typeof ErrorResponse>;
export type TResponseMeta = z.infer<typeof ResponseMeta>;
export type TIdParams = z.infer<typeof IdParams>;
export type TCodeParams = z.infer<typeof CodeParams>;