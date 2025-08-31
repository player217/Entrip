'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { AuthContextValue } from '@entrip/shared';
import { api, apiClient } from '@/lib/api-client';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = useState(true);
  const {
    isAuthenticated,
    user,
    token,
    isLoading,
    error,
    login,
    logout,
    clearError,
    checkAuth
  } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      // Skip auth check for public routes
      if (PUBLIC_ROUTES.includes(pathname)) {
        setIsInitializing(false);
        return;
      }

      try {
        // Check if we have a stored token from zustand persist (for header management only)
        const authStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
        let storedToken = null;
        
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            storedToken = parsed?.state?.token;
          } catch (e) {
            console.error('Failed to parse auth storage:', e);
          }
        }
        
        if (storedToken) {
          // Set token in API client for requests (HEADER MANAGEMENT ONLY - NO REDIRECTS)
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify token with server
          await checkAuth();
          // Note: Redirects are now handled by middleware.ts only
        }
        // Note: No redirects here - middleware handles all authentication redirects
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Note: No redirects here - middleware handles all authentication redirects
      } finally {
        setIsInitializing(false);
      }
    };

    // Add hydration guard to prevent SSR/CSR mismatches
    if (typeof window !== 'undefined') {
      initAuth();
    } else {
      setIsInitializing(false);
    }
  }, [pathname]);

  const contextValue: AuthContextValue = {
    isAuthenticated,
    user,
    token,
    isLoading: isLoading || isInitializing,
    error,
    login,
    logout,
    clearError,
    checkAuth,
  };

  // Don't render children until auth is initialized
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Route guard component
interface RouteGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'ADMIN' | 'MANAGER' | 'USER';
}

export function RouteGuard({ 
  children, 
  requireAuth = true, 
  requiredRole 
}: RouteGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Note: Authentication redirects are now handled by middleware.ts
    // RouteGuard only handles role-based redirects for authorized users
    if (requiredRole && user && isAuthenticated) {
      const hasRequiredRole = 
        requiredRole === 'USER' ||
        (requiredRole === 'MANAGER' && (user.role === 'MANAGER' || user.role === 'ADMIN')) ||
        (requiredRole === 'ADMIN' && user.role === 'ADMIN');

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or dashboard
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, requireAuth, requiredRole, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  // Note: Auth requirements are now handled by middleware.ts
  // RouteGuard only blocks role-based access for authenticated users

  if (requiredRole && user) {
    const hasRequiredRole = 
      requiredRole === 'USER' ||
      (requiredRole === 'MANAGER' && (user.role === 'MANAGER' || user.role === 'ADMIN')) ||
      (requiredRole === 'ADMIN' && user.role === 'ADMIN');

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
            <p className="text-gray-600 mb-4">이 페이지에 접근할 권한이 없습니다.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-600"
            >
              대시보드로 이동
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}