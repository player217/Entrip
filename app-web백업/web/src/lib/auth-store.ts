import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginRequest, LoginResponse, AuthState } from '@entrip/shared';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
            credentials: 'include', // Important for cookies
          });

          const data: LoginResponse = await response.json();

          if (data.success && data.user) {
            // HttpOnly cookie will be set by the server
            // Also store token in localStorage for axios interceptor
            if (data.token) {
              localStorage.setItem('auth-token', data.token);
            }
            set({
              isAuthenticated: true,
              user: data.user,
              token: data.token || null,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: data.message || '로그인에 실패했습니다.',
            });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: '서버 연결에 실패했습니다.',
          });
          return false;
        }
      },

      logout: () => {
        // Call logout API to clear HttpOnly cookie
        fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important for cookies
        }).catch(console.error);

        // Clear localStorage token
        localStorage.removeItem('auth-token');

        // Clear state
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });

        // TEMPORARY: Skip redirect for development
        console.warn('Logout - Skipping redirect for development');
        // Redirect to login page
        // if (typeof window !== 'undefined') {
        //   window.location.href = '/login';
        // }
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          
          // HttpOnly cookie will be sent automatically with credentials: 'include'
          const response = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // Important for cookies
          });

          const data = await response.json();

          if (data.success && data.user) {
            set({
              isAuthenticated: true,
              user: data.user,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            // Token is invalid, clear auth state
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null,
            });
            return false;
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null,
          });
          return false;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => 
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      // Only persist essential data (no token for security)
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        // token is not persisted - using HttpOnly cookies
      }),
    }
  )
);

// Helper hook for checking if user has required role
export const useUserRole = () => {
  const user = useAuthStore((state) => state.user);
  
  return {
    isAdmin: user?.role === 'ADMIN',
    isManager: user?.role === 'MANAGER' || user?.role === 'ADMIN',
    isUser: !!user,
    role: user?.role,
  };
};