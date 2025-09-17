'use client';

// Client-side exports only (React hooks, stores, etc.)

// Stores (client-only)
export * from './stores/workspaceStore';
export * from './stores/sessionStore';
export * from './stores/booking-store';
export * from './stores/teamBookingStore';
export * from './stores/modalStore';

// Hooks (client-only)
export * from './hooks/useTeamBooking';

// Legacy useBookings (deprecated - use unified-use-bookings)
export * from './hooks/useBookings';

// New unified useBookings hook
export { useBookings as useUnifiedBookings } from './hooks/unified-use-bookings';
export { default as useBookingsUnified } from './hooks/unified-use-bookings';

export * from './hooks/useDebounce';
export * from './hooks/useAuth';

// Auth services (client-safe)
export { AuthService, createAuthService, getAuthService } from './services/AuthService';
export type { AuthConfig } from './services/AuthService';