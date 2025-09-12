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

// Note: HttpOnly cookies are automatically sent with withCredentials: true
// No need to manually set Authorization header for cookie-based auth
// This is part of establishing SSOT for authentication

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors - Clean up local storage only (legacy cleanup)
    // HttpOnly cookies are cleared server-side on logout
    // Redirects are handled by middleware.ts as SSOT
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        // Note: No redirects here - middleware handles all authentication redirects
        // This prevents conflicts between multiple redirect sources
      }
    }
    return Promise.reject(error);
  }
);

export default api;