/**
 * useAuth Hook Implementation
 * 
 * Provides authentication state management with HttpOnly cookies.
 * Integrates with Zustand for state management.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LoginRequest } from '../../types/auth';
import type { User } from '../../types/user';
import type { AuthHookConfig, UseAuthReturn } from './types';
import { AuthService, createAuthService } from '../../services/AuthService';

// Zustand store for auth state
interface AuthStore {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
      
      setAuth: (user) => set({
        isAuthenticated: !!user,
        user,
        error: null,
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      reset: () => set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      }),
    }),
    {
      name: 'auth-state', // Zustand persist key
      storage: createJSONStorage(() => localStorage),
      // Only persist user info, not tokens
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Global auth service instance
let globalAuthService: AuthService | null = null;

/**
 * Main useAuth hook
 */
export function useAuth(config: AuthHookConfig = {}): UseAuthReturn {
  const {
    apiClient,
    autoVerify = true,
    verifyOnMount = true,
    verifyOnFocus = true,
    onAuthChange,
  } = config;
  
  // Zustand store
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    setAuth,
    setLoading,
    setError,
    reset,
  } = useAuthStore();
  
  // Initialize auth service
  const authService = useMemo(() => {
    if (!apiClient) {
      // Try to get from global or window
      const client = (typeof window !== 'undefined' && (window as any).apiClient) || null;
      if (!client) {
        console.warn('[useAuth] No API client provided');
        return null;
      }
      return createAuthService({
        apiClient: client,
        onAuthChange: (user) => {
          setAuth(user);
          onAuthChange?.(user);
        },
        onError: setError,
      });
    }
    
    return createAuthService({
      apiClient,
      onAuthChange: (user) => {
        setAuth(user);
        onAuthChange?.(user);
      },
      onError: setError,
    });
  }, [apiClient, onAuthChange, setAuth, setError]);
  
  // Store global instance
  useEffect(() => {
    if (authService) {
      globalAuthService = authService;
    }
    return () => {
      if (globalAuthService === authService) {
        globalAuthService = null;
      }
    };
  }, [authService]);
  
  // Login action
  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    if (!authService) {
      setError('Authentication service not initialized');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setAuth(result.user);
        return true;
      } else {
        setError(result.error || 'Login failed');
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authService, setAuth, setError, setLoading]);
  
  // Logout action
  const logout = useCallback(async (): Promise<void> => {
    if (!authService) {
      reset();
      return;
    }
    
    setLoading(true);
    
    try {
      await authService.logout();
      reset();
    } catch (error) {
      console.error('Logout error:', error);
      // Still reset state even if logout fails
      reset();
    } finally {
      setLoading(false);
    }
  }, [authService, reset, setLoading]);
  
  // Verify action
  const verify = useCallback(async (): Promise<boolean> => {
    if (!authService) {
      return false;
    }
    
    setLoading(true);
    
    try {
      const result = await authService.verify();
      
      if (result.isAuthenticated && result.user) {
        setAuth(result.user);
        return true;
      } else {
        setAuth(null);
        return false;
      }
    } catch (error) {
      console.error('Verify error:', error);
      setAuth(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authService, setAuth, setLoading]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);
  
  // Role checking utilities
  const hasRole = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);
  
  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);
  const isManager = useMemo(() => user?.role === 'MANAGER' || user?.role === 'ADMIN', [user]);
  
  // Auto-verify on mount
  useEffect(() => {
    if (verifyOnMount && autoVerify && authService) {
      verify();
    }
  }, [verifyOnMount, autoVerify, authService]); // verify is intentionally excluded
  
  // Auto-verify on focus
  useEffect(() => {
    if (!verifyOnFocus || !autoVerify || !authService) return;
    
    const handleFocus = () => {
      verify();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [verifyOnFocus, autoVerify, authService]); // verify is intentionally excluded
  
  return {
    // State
    isAuthenticated,
    user,
    isLoading,
    error,
    
    // Actions
    login,
    logout,
    verify,
    clearError,
    
    // Utilities
    hasRole,
    isAdmin,
    isManager,
  };
}

// Export store for direct access if needed
export { useAuthStore };

// Helper to get current auth state outside of React
export function getAuthState() {
  return useAuthStore.getState();
}

// Helper to get auth service instance
export function getAuthServiceInstance(): AuthService | null {
  return globalAuthService;
}