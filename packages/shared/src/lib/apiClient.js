import axios from 'axios';
// API 베이스 URL 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
// Axios 인스턴스 생성
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});
// 요청 인터셉터
apiClient.interceptors.request.use((config) => {
    // 인증 토큰이 있다면 헤더에 추가
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// 응답 인터셉터
apiClient.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response?.status === 401) {
        // 인증 에러 처리
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});
// 공통 에러 처리 함수
export const handleApiError = (error) => {
    if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
        if (error.message) {
            return error.message;
        }
    }
    return '알 수 없는 오류가 발생했습니다.';
};
// API 엔드포인트
export const API_ENDPOINTS = {
    // Dashboard
    dashboard: {
        stats: '/dashboard/stats',
    },
    // Booking
    booking: {
        list: '/bookings',
        detail: (id) => `/bookings/${id}`,
        create: '/bookings',
        update: (id) => `/bookings/${id}`,
        delete: (id) => `/bookings/${id}`,
    },
    // Exchange Rate
    exchange: {
        current: '/exchange/current',
        history: '/exchange/history',
    },
    // Auth
    auth: {
        login: '/auth/login',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
    },
};
