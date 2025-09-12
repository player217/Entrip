import { UserRole } from './user';

export enum BookingType {
  PACKAGE = 'PACKAGE',
  FIT = 'FIT',
  GROUP = 'GROUP',
  BUSINESS = 'BUSINESS'
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}

// UserRole imported from user.ts

export interface NewTeamPayload {
  // 일정 정보
  teamCode: string;
  teamName: string;
  departureDate: string;
  returnDate: string;
  destination: string;
  nights: number;
  days: number;
  
  // 상품 정보
  productType: string;
  airline: string;
  hotel: string;
  roomType: string;
  mealType: string;
  
  // 인원 정보
  adultCount: number;
  childCount: number;
  infantCount: number;
  totalCount: number;
  
  // 금액 정보
  adultPrice: number;
  childPrice: number;
  totalPrice: number;
  deposit: number;
  balance: number;
  
  // 고객 정보
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCompany?: string;
  
  // 담당자 정보
  managerId: string;
  managerName: string;
  
  // 상태 및 메모
  status: BookingStatus;
  memo?: string;
  
  // 시스템 정보
  createdAt?: string;
  updatedAt?: string;
}

// New Phase 2 Booking interface (matches API schema)
export interface Booking {
  id: string;
  bookingNumber: string;
  customerName: string; // Maps to API schema
  teamName: string;
  bookingType: BookingType;
  destination: string;
  startDate: string;
  endDate: string;
  paxCount: number;
  nights: number;
  days: number;
  status: BookingStatus;
  totalPrice: number;
  depositAmount?: number;
  currency: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  
  // Mapped fields for frontend compatibility
  client: string; // Maps to customerName
  price: number;  // Maps to totalPrice
  
  // Relations
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
}

export interface BookingListResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: BookingType;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  startDate?: string; // 시작일 (대체 필드)
  endDate?: string; // 종료일 (대체 필드)
  client?: string;
  keyword?: string;
}

export interface CreateBookingDto {
  customerName: string;
  teamName: string;
  bookingType: BookingType;
  destination: string;
  startDate: string;
  endDate: string;
  paxCount: number;
  nights: number;
  days: number;
  totalPrice: number;
  depositAmount?: number;
  currency?: string;
  notes?: string;
}

export interface UpdateBookingDto extends Partial<CreateBookingDto> {}

// Legacy interface for backward compatibility
export interface LegacyBooking extends NewTeamPayload {
  id: string;
  bookingNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingEvent {
  id: string;
  bookingId?: string;
  title?: string;
  name?: string;
  code?: string;
  date: string;
  type?: 'departure' | 'return' | 'payment' | 'other' | 'golf' | 'incentive' | 'honeymoon';
  typeCode?: 'GF' | 'IN' | 'HM' | 'AT';
  status: BookingStatus;
  amount?: number;
  time?: string;
  details?: string;
  manager?: string;
  paxCount?: number;
  revenue?: number;
  cost?: number;
  // 추가된 속성들 (옵셔널)
  customerName?: string;
  destination?: string;
  departureDate?: string;
  departureTime?: string; // 출발 시간
  arrivalTime?: string; // 도착 시간
  numberOfPeople?: number;
  teamName?: string; // 팀명
  returnDate?: string; // 귀국일
  totalPrice?: number; // 총 금액
}

// Alias for backward compatibility
export type BookingEntry = BookingEvent;

export interface BookingListResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookingDetailResponse {
  booking: Booking;
  events: BookingEvent[];
}

// MonthlySummary 타입 추가
export interface MonthlySummary {
  teamCount: number;
  paxCount: number;
  revenue: number;
  profit: number;
}