import axios from 'axios';

// Create axios instance with proper base URL for SSR/CSR
const baseURL = 
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || 'http://api:4000'  // SSR: Internal Docker network
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';  // CSR: Browser

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // TEMPORARY: Skip redirect for development
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized in api.ts - Skipping redirect for development');
      // if (typeof window !== 'undefined') {
      //   localStorage.removeItem('token');
      //   localStorage.removeItem('user');
      //   // Only redirect if not already on login page
      //   if (window.location.pathname !== '/login') {
      //     window.location.href = '/login';
      //   }
      // }
    }
    return Promise.reject(error);
  }
);

export default api;