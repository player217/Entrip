import { Booking as DbBooking } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert DB Booking to API response format
 * Maps DB field names to API field names for backward compatibility
 */
export function toApiBooking(booking: DbBooking & { user?: any; flights?: any[]; hotels?: any[]; vehicles?: any[]; settlements?: any[] }) {
  return {
    id: booking.id,
    code: booking.bookingNumber,  // DB: bookingNumber -> API: code
    customerName: booking.customerName,
    teamName: booking.teamName,
    teamType: booking.teamType,
    bookingType: booking.bookingType,
    
    // Location mapping
    itineraryFrom: booking.origin,      // DB: origin -> API: itineraryFrom
    itineraryTo: booking.destination,   // DB: destination -> API: itineraryTo
    
    // Dates
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    departAt: booking.startDate.toISOString(),  // Use startDate as departAt
    arriveAt: booking.endDate.toISOString(),     // Use endDate as arriveAt
    
    // Counts and amounts
    paxCount: booking.paxCount,
    nights: booking.nights,
    days: booking.days,
    amount: booking.totalPrice.toString(),  // API expects string
    totalPrice: booking.totalPrice.toString(),
    depositAmount: booking.depositAmount?.toString() || null,
    currency: booking.currency,
    
    // Status and metadata
    status: booking.status,
    manager: booking.manager,
    managerId: booking.manager,  // Duplicate for compatibility
    companyCode: booking.companyCode,
    
    // Contact info
    representative: booking.representative || null,
    contact: booking.contact || null,
    email: booking.email || null,
    customerPhone: booking.contact || booking.representative || '010-0000-0000', // Fallback
    customerEmail: booking.email || null,
    
    // Additional info
    notes: booking.notes || null,
    version: booking.version,
    
    // Timestamps
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    
    // Relations (if included)
    user: booking.user || null,
    flights: booking.flights || [],
    hotels: booking.hotels || [],
    vehicles: booking.vehicles || [],
    settlements: booking.settlements || []
  };
}

/**
 * Convert API request to DB format for creation
 * Handles both legacy API format and new QuickBookingModal format
 */
export function fromApiCreateRequest(data: any) {
  // QuickBookingModal에서 오는 필드명 변환
  const startDate = data.startDate || data.departureDate;
  const endDate = data.endDate || data.returnDate;
  const paxCount = data.paxCount || data.pax;
  
  // 날짜 차이 계산 (nights, days 자동 계산)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const calculatedDays = calculatedNights + 1;
  
  return {
    customerName: data.customerName,
    teamName: data.teamName,
    teamType: data.teamType || 'GROUP',
    bookingType: data.bookingType,
    origin: data.origin || data.itineraryFrom || 'Seoul', 
    destination: data.destination || data.itineraryTo || 'Busan',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    paxCount: paxCount,
    nights: data.nights || calculatedNights,
    days: data.days || calculatedDays,
    manager: data.manager || data.coordinator || 'System',
    totalPrice: data.totalPrice,
    depositAmount: data.depositAmount || null,
    currency: data.currency || 'KRW',
    representative: data.representative || null,
    contact: data.contact || data.customerPhone || null,
    email: data.email || data.customerEmail || null,
    notes: data.notes || data.memo || null,
    // 복잡한 구조 필드 (별도 처리 필요)
    flights: data.flights || [],
    vehicles: data.vehicles || [],
    hotels: data.hotels || [],
    settlements: data.settlements || []
  };
}

/**
 * Convert API request to DB format for update
 */
export function fromApiUpdateRequest(data: any) {
  const result: any = {};
  
  // Only include fields that are present in the request
  if (data.customerName !== undefined) result.customerName = data.customerName;
  if (data.teamName !== undefined) result.teamName = data.teamName;
  if (data.teamType !== undefined) result.teamType = data.teamType;
  if (data.bookingType !== undefined) result.bookingType = data.bookingType;
  
  // Location mapping
  if (data.origin !== undefined) result.origin = data.origin;
  if (data.itineraryFrom !== undefined) result.origin = data.itineraryFrom;
  if (data.destination !== undefined) result.destination = data.destination;
  if (data.itineraryTo !== undefined) result.destination = data.itineraryTo;
  
  // Dates
  if (data.startDate !== undefined) result.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) result.endDate = new Date(data.endDate);
  
  // Amounts and counts
  if (data.paxCount !== undefined) result.paxCount = data.paxCount;
  if (data.nights !== undefined) result.nights = data.nights;
  if (data.days !== undefined) result.days = data.days;
  if (data.totalPrice !== undefined) result.totalPrice = data.totalPrice;
  if (data.amount !== undefined) result.totalPrice = data.amount;
  if (data.depositAmount !== undefined) result.depositAmount = data.depositAmount;
  if (data.currency !== undefined) result.currency = data.currency;
  
  // Other fields
  if (data.status !== undefined) result.status = data.status;
  if (data.manager !== undefined) result.manager = data.manager;
  if (data.representative !== undefined) result.representative = data.representative;
  if (data.contact !== undefined) result.contact = data.contact;
  if (data.customerPhone !== undefined) result.contact = data.customerPhone;
  if (data.email !== undefined) result.email = data.email;
  if (data.customerEmail !== undefined) result.email = data.customerEmail;
  if (data.notes !== undefined) result.notes = data.notes;
  
  return result;
}