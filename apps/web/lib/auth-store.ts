'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../src/lib/api-client';
import { User, LoginRequest } from '@entrip/shared';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setToken: (token) => {
        set({ token, isAuthenticated: !!token });
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete api.defaults.headers.common['Authorization'];
        }
      },

      setUser: (user) => set({ user }),

      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await api.post('/auth/login', data);
          
          // Handle different possible response formats
          const token = response.data?.token || response.data?.accessToken || response.data?.access_token;
          const user = response.data?.user || response.data?.profile || null;
          
          if (!token) {
            throw new Error('No token received from server');
          }
          
          // Set token in state and axios headers
          get().setToken(token);
          set({ user, isAuthenticated: true });
          
          // Extra safety: directly save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
            if (user) {
              localStorage.setItem('user', JSON.stringify(user));
              localStorage.setItem('userId', user.id);
            }
          }
          
          // Verify token with server
          try {
            await api.get('/auth/verify');
          } catch (verifyError) {
            console.warn('Token verification failed:', verifyError);
          }
          
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          console.error('Login error:', error);
          set({
            isLoading: false,
            error: error.response?.data?.message || error.message || 'Login failed',
            isAuthenticated: false
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear everything regardless of API response
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            error: null
          });
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
          }
          
          delete api.defaults.headers.common['Authorization'];
        }
      },

      checkAuth: async () => {
        const storedToken = get().token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        
        if (!storedToken) {
          set({ isAuthenticated: false, user: null, token: null });
          return false;
        }

        try {
          // Ensure token is in headers
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const response = await api.get('/auth/verify');
          
          if (response.data?.success && response.data?.user) {
            set({
              isAuthenticated: true,
              user: response.data.user,
              token: storedToken
            });
            return true;
          } else {
            throw new Error('Invalid response from verify endpoint');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          
          // Clear invalid auth state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
          }
          
          delete api.defaults.headers.common['Authorization'];
          
          set({
            isAuthenticated: false,
            user: null,
            token: null
          });
          
          return false;
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'entrip-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);