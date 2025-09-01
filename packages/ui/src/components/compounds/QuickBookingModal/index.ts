'use client';

export { QuickBookingModal } from './QuickBookingModal';
export { BookingPrintTemplate } from './BookingPrintTemplate';
export type { QuickBookingModalProps, QuickBookingFormData } from './types';
export type { ReservationPrint } from './BookingPrintTemplate';

// Re-export validation schema types for external use
export { quickBookingSchema, flightSchema, vehicleSchema, hotelSchema, settlementSchema } from './fields/validation';