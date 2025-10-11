import axios, { AxiosInstance, AxiosError } from 'axios'

// 환경 감지
const isServer = typeof window === 'undefined'

// 인증 전략 결정 (기본: cookie 기반)
const AUTH_STRATEGY = (process.env.NEXT_PUBLIC_API_AUTH_MODE || process.env.API_AUTH_MODE || 'cookie').toLowerCase()
const TOKEN_STORAGE_KEY = process.env.NEXT_PUBLIC_API_TOKEN_KEY || 'accessToken'
const shouldUseBearer = AUTH_STRATEGY === 'bearer' || AUTH_STRATEGY === 'token'

// API 베이스 URL 설정 (서버는 내부 DNS, 클라이언트는 localhost 프록시)
const API_BASE_URL = isServer
  ? (process.env.INTERNAL_API_URL || 'http://api:4000/api')
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')

// Axios 인스턴스 생성
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(process.env.API_REQUEST_TIMEOUT || 10000),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: 인증 전략에 따라 헤더/쿠키 처리
apiClient.interceptors.request.use(
  (config) => {
    // config.headers는 이미 AxiosHeaders 인스턴스이므로 초기화 불필요

    if (shouldUseBearer && typeof window !== 'undefined') {
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      // 쿠키 기반 인증: 항상 withCredentials 유지
      config.withCredentials = true
      delete config.headers.Authorization
    }

    return config
  },
  (error) => Promise.reject(error)
)

// 응답 인터셉터: 401 처리 및 토큰 정리
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && shouldUseBearer && typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      // bearer 전략 사용 시 로그인 페이지로 이동
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 공통 에러 처리 함수
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as any)?.message
    if (message) return message
    if (error.message) return error.message
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
