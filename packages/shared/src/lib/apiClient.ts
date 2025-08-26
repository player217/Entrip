import axios, { AxiosInstance, AxiosError } from 'axios'

// 서버/클라이언트 환경 구분
const isServer = typeof window === 'undefined'

// API 베이스 URL 설정 (서버는 내부 DNS, 클라이언트는 localhost)
const API_BASE_URL = isServer 
  ? (process.env.INTERNAL_API_URL || 'http://api:4000/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')

// Axios 인스턴스 생성
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // 인증 토큰이 있다면 헤더에 추가
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 인증 에러 처리
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// 공통 에러 처리 함수
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.message) {
      return error.message
    }
  }
  return '알 수 없는 오류가 발생했습니다.'
}

// API 엔드포인트
export const API_ENDPOINTS = {
  // Dashboard
  dashboard: {
    stats: '/dashboard/stats',
  },
  // Booking (Phase 2 RBAC endpoints)
  booking: {
    list: '/bookings',
    detail: (id: string) => `/bookings/${id}`,
    create: '/bookings',
    update: (id: string) => `/bookings/${id}`,
    delete: (id: string) => `/bookings/${id}`,
    updateStatus: (id: string) => `/bookings/${id}/status`,
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
}
