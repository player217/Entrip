import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LoginRequest, LoginResponse, AuthState } from '@entrip/shared';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

// Use proxy routes to avoid CORS and port issues
// The Next.js API routes will forward requests to the actual API server

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, _get) => ({
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
          const response = await fetch('/api/auth/login', {
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
            // DO NOT store token in localStorage anymore
            set({
              isAuthenticated: true,
              user: data.user,
              token: null, // No token in client state
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
        // ENHANCED: Improve logout error handling without preventing logout
        const performLogout = async () => {
          try {
            // Call logout API to clear HttpOnly cookie
            const response = await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include', // Important for cookies
            });

            if (!response.ok) {
              console.warn('Logout API call failed but proceeding with client cleanup:', response.status);
            } else {
              console.log('✅ Logout API call successful');
            }
          } catch (error) {
            // Don't prevent logout even if API call fails
            console.warn('Logout API call error but proceeding with client cleanup:', error);
          }
        };

        // Perform async logout call but don't wait for it
        performLogout();

        // Clear any legacy localStorage items immediately
        try {
          localStorage.removeItem('auth-token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userId'); // Added messenger userId cleanup
        } catch (error) {
          console.warn('LocalStorage cleanup error:', error);
        }

        // Clear state immediately
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null,
        });

        // Redirect to login page
        if (typeof window !== 'undefined') {
          console.log('🔄 Redirecting to login page after logout');
          window.location.href = '/login';
        }
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          
          // HttpOnly cookie will be sent automatically with credentials: 'include'
          const response = await fetch('/api/auth/verify', {
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