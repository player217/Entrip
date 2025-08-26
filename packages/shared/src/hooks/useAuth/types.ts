/**
 * Type definitions for useAuth hook
 */

import type { LoginRequest } from '../../types/auth';
import type { User } from '../../types/user';

export interface AuthHookConfig {
  apiClient?: any;
  autoVerify?: boolean;
  verifyOnMount?: boolean;
  verifyOnFocus?: boolean;
  onAuthChange?: (user: User | null) => void;
}

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  verify: () => Promise<boolean>;
  clearError: () => void;
  
  // Utilities
  hasRole: (roles: string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
}