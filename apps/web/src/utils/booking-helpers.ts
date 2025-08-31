import { Booking, BookingEvent } from '@entrip/shared';

/**
 * Booking 또는 BookingEvent에서 날짜를 안전하게 추출하는 헬퍼 함수
 */
export function getBookingDate(b: Booking | BookingEvent): Date | null {
  try {
    let dateStr: string = '';
    
    // Booking 타입인 경우
    if ('startDate' in b && b.startDate) {
      dateStr = b.startDate;
    }
    // BookingEvent 타입인 경우 (여러 날짜 필드 확인)
    else if ('departureDate' in b && b.departureDate) {
      dateStr = b.departureDate;
    }
    else if ('date' in b && b.date) {
      dateStr = b.date;
    }
    
    return dateStr ? new Date(dateStr) : null;
  } catch (e) {
    console.warn('Invalid date in booking:', e);
    return null;
  }
}

/**
 * Booking 또는 BookingEvent에서 가격을 안전하게 추출하는 헬퍼 함수
 */
export function priceOf(b: Booking | BookingEvent): number {
  // Booking 타입인 경우
  if ('totalPrice' in b && typeof b.totalPrice === 'number') {
    return b.totalPrice;
  }
  // BookingEvent 타입인 경우
  if ('revenue' in b && typeof b.revenue === 'number') {
    return b.revenue;
  }
  if ('amount' in b && typeof b.amount === 'number') {
    return b.amount;
  }
  
  return 0;
}

/**
 * Booking 또는 BookingEvent에서 인원수를 안전하게 추출하는 헬퍼 함수
 */
export function getPaxCount(b: Booking | BookingEvent): number {
  // 공통 필드
  if ('paxCount' in b && typeof b.paxCount === 'number') {
    return b.paxCount;
  }
  // BookingEvent의 추가 필드들
  if ('numberOfPeople' in b && typeof b.numberOfPeople === 'number') {
    return b.numberOfPeople;
  }
  
  return 0;
}

/**
 * Booking 또는 BookingEvent에서 고객명을 안전하게 추출하는 헬퍼 함수
 */
export function getCustomerName(b: Booking | BookingEvent): string {
  if ('customerName' in b && b.customerName) {
    return b.customerName;
  }
  if ('name' in b && b.name) {
    return b.name;
  }
  
  return '미정';
}

/**
 * Booking 또는 BookingEvent에서 반환일을 안전하게 추출하는 헬퍼 함수
 */
export function getReturnDate(b: Booking | BookingEvent): Date | null {
  try {
    let dateStr: string = '';
    
    // Booking 타입인 경우
    if ('endDate' in b && b.endDate) {
      dateStr = b.endDate;
    }
    // BookingEvent 타입인 경우
    else if ('returnDate' in b && b.returnDate) {
      dateStr = b.returnDate;
    }
    
    return dateStr ? new Date(dateStr) : null;
  } catch (e) {
    console.warn('Invalid return date in booking:', e);
    return null;
  }
}