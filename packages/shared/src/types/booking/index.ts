/**
 * Booking 타입 시스템 통합 인덱스
 * 모든 Booking 관련 타입과 헬퍼를 한 곳에서 관리
 */

// DTO 및 스키마 내보내기
export {
  // Enums
  BookingStatusSchema,
  BookingTypeSchema,
  UserRoleSchema,
  
  // Main schemas
  BookingDTOSchema,
  BookingUpdateSchema,
  BookingCreateSchema,
  
  // Types
  type BookingStatus,
  type BookingType,
  type UserRole,
  type BookingDTO,
  type BookingUpdateDTO,
  type BookingCreateDTO,
  
  // Validation functions
  validateBookingDTO,
  validateBookingUpdate,
  validateBookingCreate,
  isBookingDTO,
} from './dto';

// 헬퍼 함수 및 UI 타입 내보내기
export {
  // Types
  type BookingTypeCode,
  type BookingEvent,
  
  // Helper functions
  BookingHelpers,
} from './helpers';

// 타입 별칭 (기존 코드 호환성)
export type { BookingDTO as Booking } from './dto';

// Re-export for convenience
import { BookingHelpers } from './helpers';
import { validateBookingDTO } from './dto';

export const bookingUtils = {
  ...BookingHelpers,
  validate: validateBookingDTO,
};