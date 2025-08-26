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
export { AuthService, createAuthService, getAuthService } from './services/AuthService';
export type { AuthConfig } from './services/AuthService';
export * from './utils/logger';
export * from './utils/debounce';
export { logger } from './lib/logger';
export { apiClient, API_ENDPOINTS, handleApiError } from './lib/apiClient';

// Hook exports (Client-only - must be imported from @entrip/shared/client)
// Removed from main export to prevent server component issues

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