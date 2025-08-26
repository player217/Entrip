/**
 * Unified useBookings Hook System
 * 
 * Export all public APIs from the useBookings module
 */

// Main hook
export { useBookings } from './useBookings';

// Types
export type {
  BookingHookConfig,
  BookingHookReturn,
  PaginationInfo,
  DataProvider,
  BookingEventData,
  BulkEventData,
  BookingEventCallbacks,
} from './types';

// Service class (for advanced usage)
export { BookingService } from './BookingService';

// Providers
export { SWRProvider } from './providers/SWRProvider';

// Legacy compatibility
export {
  useBookingsLegacy,
  useBooking,
  createBooking,
  updateBooking,
  deleteBooking,
} from './legacy';

// Default export for convenience
export { useBookings as default } from './useBookings';