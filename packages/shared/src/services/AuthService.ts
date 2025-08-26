/**
 * Unified Authentication Service
 * 
 * Single Source of Truth for authentication using HttpOnly cookies.
 * No client-side token storage for enhanced security.
 */

import type { 
  LoginRequest, 
  LoginResponse,
  JWTPayload 
} from '../types/auth';
import type { User } from '../types/user';

export interface AuthConfig {
  apiClient: any;
  onAuthChange?: (user: User | null) => void;
  onError?: (error: string) => void;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export class AuthService {
  private apiClient: any;
  private onAuthChange?: (user: User | null) => void;
  private onError?: (error: string) => void;
  private verifyInterval?: NodeJS.Timeout;

  constructor(config: AuthConfig) {
    this.apiClient = config.apiClient;
    this.onAuthChange = config.onAuthChange;
    this.onError = config.onError;
  }

  /**
   * Login with credentials
   * Sets HttpOnly cookie on success (no token returned to client)
   */
  async login(credentials: LoginRequest): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await this.apiClient.post('/api/auth/login', credentials, {
        withCredentials: true, // Essential for cookie handling
      });

      const data: LoginResponse = response.data;

      if (data.success && data.user) {
        // DO NOT store token in localStorage - only use HttpOnly cookie
        this.onAuthChange?.(data.user);
        this.startTokenRefresh();
        
        return {
          success: true,
          user: data.user,
        };
      } else {
        const error = data.message || 'Login failed';
        this.onError?.(error);
        return {
          success: false,
          error,
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Server connection failed';
      this.onError?.(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify current authentication status
   * Uses HttpOnly cookie for verification
   */
  async verify(): Promise<{ isAuthenticated: boolean; user?: User }> {
    try {
      const response = await this.apiClient.get('/api/auth/verify', {
        withCredentials: true, // Essential for cookie handling
      });

      const data = response.data;

      if (data.success && data.user) {
        this.onAuthChange?.(data.user);
        return {
          isAuthenticated: true,
          user: data.user,
        };
      } else {
        this.onAuthChange?.(null);
        return {
          isAuthenticated: false,
        };
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      this.onAuthChange?.(null);
      return {
        isAuthenticated: false,
      };
    }
  }

  /**
   * Logout and clear authentication
   * Clears HttpOnly cookie on server
   */
  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/api/auth/logout', {}, {
        withCredentials: true, // Essential for cookie handling
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.stopTokenRefresh();
      this.onAuthChange?.(null);
      
      // Clear any legacy localStorage items
      this.clearLegacyStorage();
    }
  }

  /**
   * Refresh authentication token
   * Server handles cookie refresh transparently
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await this.apiClient.post('/api/auth/refresh', {}, {
        withCredentials: true, // Essential for cookie handling
      });

      return response.data.success === true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Start automatic token refresh
   * Refreshes token every 20 minutes (before 24h expiry)
   */
  private startTokenRefresh(): void {
    this.stopTokenRefresh(); // Clear any existing interval
    
    this.verifyInterval = setInterval(async () => {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        // If refresh fails, verify authentication status
        const { isAuthenticated } = await this.verify();
        if (!isAuthenticated) {
          this.logout();
        }
      }
    }, 20 * 60 * 1000); // 20 minutes
  }

  /**
   * Stop automatic token refresh
   */
  private stopTokenRefresh(): void {
    if (this.verifyInterval) {
      clearInterval(this.verifyInterval);
      this.verifyInterval = undefined;
    }
  }

  /**
   * Clear legacy localStorage items (migration helper)
   */
  private clearLegacyStorage(): void {
    if (typeof window !== 'undefined') {
      // Remove all auth-related localStorage items
      const keysToRemove = [
        'auth-token',
        'token',
        'user',
        'auth-storage',
        'auth-state',
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      });
    }
  }

  /**
   * Get auth headers for WebSocket or special cases
   * Returns empty object as cookies are sent automatically
   */
  getAuthHeaders(): Record<string, string> {
    // No Authorization header needed - cookies are sent automatically
    return {};
  }

  /**
   * Check if user has specific role
   */
  hasRole(user: User | null, roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopTokenRefresh();
    this.onAuthChange = undefined;
    this.onError = undefined;
  }
}

// Singleton instance management
let authServiceInstance: AuthService | null = null;

export function createAuthService(config: AuthConfig): AuthService {
  if (authServiceInstance) {
    authServiceInstance.destroy();
  }
  authServiceInstance = new AuthService(config);
  return authServiceInstance;
}

export function getAuthService(): AuthService | null {
  return authServiceInstance;
}