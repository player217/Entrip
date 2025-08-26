/**
 * Booking 타입 어댑터
 * BookingEvent와 Booking 타입 간의 변환을 담당
 */

import { Booking, BookingEvent, BookingStatus, BookingType } from './booking';

/**
 * BookingEvent를 Booking으로 변환
 */
export function bookingEventToBooking(event: BookingEvent): Booking {
  return {
    id: event.id,
    bookingNumber: event.bookingId || `BK-${event.id}`,
    customerName: event.customerName || event.name || 'Unknown',
    teamName: event.name || 'Unknown Team',
    bookingType: event.type === 'golf' ? BookingType.PACKAGE : 
                 event.type === 'incentive' ? BookingType.GROUP : 
                 event.type === 'honeymoon' ? BookingType.BUSINESS : BookingType.PACKAGE,
    destination: event.destination || 'Unknown',
    startDate: event.date || event.departureDate || new Date().toISOString(),
    endDate: event.date || event.departureDate || new Date().toISOString(),
    paxCount: event.paxCount || event.numberOfPeople || 1,
    nights: 0,
    days: 1,
    status: event.status,
    totalPrice: event.revenue || event.amount || 0,
    currency: 'KRW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: event.manager || 'system',
    // Mapped fields
    client: event.customerName || event.name || 'Unknown',
    price: event.revenue || event.amount || 0,
  };
}

/**
 * Booking을 BookingEvent로 변환
 */
export function bookingToBookingEvent(booking: Booking): BookingEvent {
  return {
    id: booking.id,
    bookingId: booking.bookingNumber,
    name: booking.teamName,
    date: booking.startDate,
    type: booking.bookingType?.toLowerCase() as any,
    typeCode: booking.bookingType === BookingType.PACKAGE ? 'GF' :
              booking.bookingType === BookingType.GROUP ? 'IN' :
              booking.bookingType === BookingType.BUSINESS ? 'HM' : 'AT',
    status: booking.status,
    paxCount: booking.paxCount,
    revenue: booking.totalPrice,
    cost: Math.floor(booking.totalPrice * 0.7), // 임시 계산
    customerName: booking.customerName,
    destination: booking.destination,
    departureDate: booking.startDate,
    numberOfPeople: booking.paxCount,
    manager: booking.createdBy,
  };
}

/**
 * BookingEvent 배열을 Record<string, Booking[]> 형식으로 변환
 */
export function bookingEventsToCalendarFormat(events: Record<string, BookingEvent[]>): Record<string, Booking[]> {
  const result: Record<string, Booking[]> = {};
  
  for (const [date, dayEvents] of Object.entries(events)) {
    result[date] = dayEvents.map(bookingEventToBooking);
  }
  
  return result;
}

/**
 * StatusTag용 enum 변환 유틸
 */
export function bookingStatusToString(status: BookingStatus): string {
  return status.toLowerCase();
}

export function stringToBookingStatus(status: string): BookingStatus {
  const upperStatus = status.toUpperCase();
  if (upperStatus in BookingStatus) {
    return BookingStatus[upperStatus as keyof typeof BookingStatus];
  }
  return BookingStatus.PENDING;
}