// Server-safe exports (can be imported in API routes)
// Re-export everything from server for backwards compatibility
export * from './types/user';
export * from './types/auth';
export * from './types/booking';
// Explicitly re-export UserRole to resolve ambiguity
export { UserRole } from './types/user';
export * from './types/booking-adapter';
export * from './types/team-booking';
export * from './types/log';
export * from './services/bookingService';
export * from './services/teamBookingService';
export * from './utils/logger';
export * from './utils/debounce';
export { logger } from './lib/logger';
export { apiClient, API_ENDPOINTS, handleApiError } from './lib/apiClient';

// Data exports
export * from './data/korean-airports';
export * from './data/international-airports';
// export * from './data/all-airports'; // Temporarily disabled due to conflicts
// export * from './data/flight-routes'; // Temporarily disabled due to conflicts

// Flight API exports
export * from './lib/flightApi';

// Client-only exports (must be imported explicitly from /client)
// NOTE: Do not use these in API routes or server components
// Instead, import from '@entrip/shared/client' when needed in client components