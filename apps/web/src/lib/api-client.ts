/**
 * Unified API Client for Entrip Web Application
 * 
 * This is the single source of truth for all API communications.
 * Consolidates the functionality of:
 * - axiosInstance (proxy pattern)
 * - api (SSR/CSR handling)
 * - fetcher (native fetch)
 * 
 * Features:
 * - SSR/CSR environment detection
 * - Automatic proxy routing for browser requests
 * - Unified authentication handling
 * - Standardized error handling
 * - WebSocket compatibility
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

// Environment detection
const isServer = typeof window === 'undefined';

// Base URL configuration
const getBaseURL = (): string => {
  if (isServer) {
    // Server-side: Direct Docker network communication
    return process.env.INTERNAL_API_URL || 'http://api:4000';
  } else {
    // Client-side: Use Next.js API routes as proxy
    return '/';
  }
};

// Custom error class for consistent error handling
export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: unknown;

  constructor(status: number, statusText: string, data?: unknown) {
    super(`API Error: ${status} ${statusText}`);
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Create the unified axios instance
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: getBaseURL(),
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable cookie-based authentication
    timeout: 10000, // 10 seconds timeout
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // HttpOnly cookies are automatically sent with withCredentials: true
      // No need to manually handle tokens - this is our SSOT
      
      // Ensure cookies are sent with every request
      config.withCredentials = true;

      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error) => {
      console.error('[API] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        console.warn('[API] 401 Unauthorized');
        
        // No need to clear localStorage - we're not using it for auth
        // Middleware.ts will handle the redirect
      }

      // Transform to custom error
      if (error.response) {
        throw new ApiError(
          error.response.status,
          error.response.statusText,
          error.response.data
        );
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create and export the singleton instance
export const apiClient = createApiClient();

// Convenience methods matching the old interfaces
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    apiClient.get<T>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    apiClient.post<T>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    apiClient.put<T>(url, data, config),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    apiClient.patch<T>(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
    apiClient.delete<T>(url, config),
};

// Export default for backward compatibility
export default apiClient;

// Helper function for SWR/React Query fetchers
export const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

// Type-safe API endpoints (can be extended)
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    verify: '/api/auth/verify',
  },
  bookings: {
    list: '/api/bookings',
    detail: (id: string) => `/api/bookings/${id}`,
    create: '/api/bookings',
    update: (id: string) => `/api/bookings/${id}`,
    delete: (id: string) => `/api/bookings/${id}`,
  },
  messages: {
    list: '/api/messages',
    detail: (id: string) => `/api/messages/${id}`,
  },
  exchange: '/api/exchange',
  health: '/api/health',
} as const;

// V2 API endpoints (packages/api)
export const API_V2_ENDPOINTS = {
  auth: {
    login: '/api/v2/auth/login',
    logout: '/api/v2/auth/logout',
    register: '/api/v2/auth/register',
    refresh: '/api/v2/auth/refresh',
    me: '/api/v2/auth/me',
  },
  bookings: {
    list: '/api/v2/bookings',
    detail: (id: string) => `/api/v2/bookings/${id}`,
    create: '/api/v2/bookings',
    update: (id: string) => `/api/v2/bookings/${id}`,
    delete: (id: string) => `/api/v2/bookings/${id}`,
  },
  calendar: {
    list: '/api/v2/calendar',
    detail: (id: string) => `/api/v2/calendar/${id}`,
    create: '/api/v2/calendar',
    update: (id: string) => `/api/v2/calendar/${id}`,
    delete: (id: string) => `/api/v2/calendar/${id}`,
  },
  finance: {
    list: '/api/v2/finance',
    stats: '/api/v2/finance/stats',
    approve: (id: string) => `/api/v2/finance/${id}/approve`,
  },
  health: '/api/v2/health',
} as const;