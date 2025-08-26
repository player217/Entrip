/**
 * Unified useAuth Hook
 * 
 * Single Source of Truth for authentication state management.
 * Uses HttpOnly cookies exclusively - no client-side token storage.
 */

export { useAuth } from './useAuth';
export type { UseAuthReturn, AuthHookConfig } from './types';
export { AuthProvider, useAuthContext } from './AuthProvider';