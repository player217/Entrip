import axios from 'axios';

// 서버/클라이언트 환경 구분
const isServer = typeof window === 'undefined';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: isServer 
    ? (process.env.INTERNAL_API_URL || 'http://api:4000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookie-based authentication
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - clearing token and redirecting to login');
      // Clear token and redirect to login
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;