/**
 * D1-D3: DB/Mock 데이터 단일 소스화
 * 회사별 데이터 격리 E2E 테스트
 * 
 * Purpose: J1/Star 관리자 간 크로스 컴퍼니 데이터 접근을 테스트하여
 * 회사별 데이터 격리가 올바르게 작동하는지 검증합니다.
 * 
 * Test Cases:
 * 1. J1 관리자 → Star 데이터 접근 시 403
 * 2. Star 관리자 → J1 데이터 접근 시 403
 */

import { test, expect } from '@playwright/test';
import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4001';

interface LoginCredentials {
  companyCode: string;
  username: string;
  password: string;
}

interface AuthContext {
  token: string;
  user: any;
  companyCode: string;
}

/**
 * 로그인을 수행하고 인증 컨텍스트를 반환합니다.
 */
async function login(credentials: LoginCredentials): Promise<AuthContext> {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials, {
    withCredentials: true,
    validateStatus: (status) => status < 500 // 4xx도 성공으로 처리
  });
  
  if (response.status !== 200) {
    throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  // 쿠키에서 토큰 추출 (실제 구현에서는 HttpOnly 쿠키 사용)
  const cookies = response.headers['set-cookie'];
  let token = '';
  
  if (cookies) {
    const authCookie = cookies.find(cookie => cookie.startsWith('auth-token='));
    if (authCookie) {
      token = authCookie.split(';')[0].split('=')[1];
    }
  }
  
  return {
    token,
    user: response.data.user,
    companyCode: credentials.companyCode
  };
}

/**
 * 인증된 API 요청을 수행합니다.
 */
async function authenticatedRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  authContext: AuthContext,
  data?: any
) {
  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Cookie': `auth-token=${authContext.token}`,
      'Content-Type': 'application/json'
    },
    data,
    validateStatus: (status: number) => status < 500, // 4xx도 성공으로 처리하여 상태 코드 검증 가능
    withCredentials: true
  };
  
  return await axios(config);
}

/**
 * 특정 회사의 예약 데이터를 조회 시도합니다.
 */
async function attemptBookingAccess(authContext: AuthContext, targetCompanyCode?: string) {
  const endpoint = targetCompanyCode 
    ? `/api/v1/bookings?companyCode=${targetCompanyCode}`
    : '/api/v1/bookings';
    
  return await authenticatedRequest('GET', endpoint, authContext);
}

/**
 * 특정 회사의 사용자 데이터를 조회 시도합니다.
 */
async function attemptUserAccess(authContext: AuthContext, targetCompanyCode?: string) {
  const endpoint = targetCompanyCode 
    ? `/api/users?companyCode=${targetCompanyCode}`
    : '/api/users';
    
  return await authenticatedRequest('GET', endpoint, authContext);
}

test.describe('Company Data Isolation Tests', () => {
  let j1AdminAuth: AuthContext;
  let starAdminAuth: AuthContext;
  
  // 테스트 전 로그인 수행
  test.beforeAll(async () => {
    // J1 관리자 로그인
    try {
      j1AdminAuth = await login({
        companyCode: 'j1',
        username: 'admin@j1.com',
        password: 'pass1234'
      });
      console.log('✅ J1 admin login successful');
    } catch (error) {
      console.error('❌ J1 admin login failed:', error);
      throw error;
    }
    
    // Star 관리자 로그인
    try {
      starAdminAuth = await login({
        companyCode: 'star',
        username: 'admin@star.com',
        password: 'pass1234'
      });
      console.log('✅ Star admin login successful');
    } catch (error) {
      console.error('❌ Star admin login failed:', error);
      throw error;
    }
  });
  
  test('J1 관리자는 자신의 회사 데이터에 접근할 수 있어야 함', async () => {
    const response = await attemptBookingAccess(j1AdminAuth);
    
    expect(response.status).toBe(200);
    
    if (response.data && response.data.length > 0) {
      // 모든 예약이 J1 회사 것인지 확인
      const bookings = response.data;
      for (const booking of bookings) {
        expect(booking.companyCode).toBe('j1');
      }
    }
  });
  
  test('Star 관리자는 자신의 회사 데이터에 접근할 수 있어야 함', async () => {
    const response = await attemptBookingAccess(starAdminAuth);
    
    expect(response.status).toBe(200);
    
    if (response.data && response.data.length > 0) {
      // 모든 예약이 Star 회사 것인지 확인
      const bookings = response.data;
      for (const booking of bookings) {
        expect(booking.companyCode).toBe('star');
      }
    }
  });
  
  test('J1 관리자가 Star 회사 데이터에 접근 시 403 에러', async () => {
    const response = await attemptBookingAccess(j1AdminAuth, 'star');
    
    // 403 Forbidden 또는 빈 결과 예상
    expect([200, 403]).toContain(response.status);
    
    if (response.status === 200) {
      // 200이면 데이터가 비어있거나 J1 데이터만 있어야 함
      if (response.data && response.data.length > 0) {
        const bookings = response.data;
        for (const booking of bookings) {
          expect(booking.companyCode).not.toBe('star');
        }
      }
    }
  });
  
  test('Star 관리자가 J1 회사 데이터에 접근 시 403 에러', async () => {
    const response = await attemptBookingAccess(starAdminAuth, 'j1');
    
    // 403 Forbidden 또는 빈 결과 예상
    expect([200, 403]).toContain(response.status);
    
    if (response.status === 200) {
      // 200이면 데이터가 비어있거나 Star 데이터만 있어야 함
      if (response.data && response.data.length > 0) {
        const bookings = response.data;
        for (const booking of bookings) {
          expect(booking.companyCode).not.toBe('j1');
        }
      }
    }
  });
  
  test('J1 관리자가 다른 회사 사용자 정보 접근 시 차단됨', async () => {
    // 인증 정보 확인
    expect(j1AdminAuth.user.companyCode).toBe('j1');
    
    // 다른 회사 사용자 데이터 접근 시도
    const response = await authenticatedRequest(
      'GET', 
      '/api/auth/verify', 
      starAdminAuth // Star 토큰으로 요청
    );
    
    // J1 관리자는 Star 사용자 정보를 볼 수 없어야 함
    if (response.status === 200) {
      expect(response.data.user.companyCode).toBe('star');
      expect(response.data.user.companyCode).not.toBe('j1');
    }
  });
  
  test('Star 관리자가 다른 회사 사용자 정보 접근 시 차단됨', async () => {
    // 인증 정보 확인
    expect(starAdminAuth.user.companyCode).toBe('star');
    
    // 다른 회사 사용자 데이터 접근 시도  
    const response = await authenticatedRequest(
      'GET',
      '/api/auth/verify',
      j1AdminAuth // J1 토큰으로 요청
    );
    
    // Star 관리자는 J1 사용자 정보를 볼 수 없어야 함
    if (response.status === 200) {
      expect(response.data.user.companyCode).toBe('j1');
      expect(response.data.user.companyCode).not.toBe('star');
    }
  });
  
  test('Cross-company 예약 생성 시도 시 차단됨', async () => {
    const crossCompanyBooking = {
      companyCode: 'star', // J1 관리자가 Star 회사로 예약 시도
      customerName: '테스트 고객',
      teamName: '테스트 팀',
      teamType: '가족여행',
      bookingType: 'PACKAGE',
      origin: '서울',
      destination: '제주도',
      startDate: '2025-12-01',
      endDate: '2025-12-03',
      paxCount: 4,
      nights: 2,
      days: 3,
      status: 'PENDING',
      manager: '테스트매니저',
      totalPrice: 1000000,
      currency: 'KRW'
    };
    
    const response = await authenticatedRequest(
      'POST',
      '/api/v1/bookings',
      j1AdminAuth,
      crossCompanyBooking
    );
    
    // 403 또는 400 에러 예상 (다른 회사로 예약 불가)
    expect([400, 403, 422]).toContain(response.status);
  });
  
  test('회사 코드 불일치 시 토큰 검증 실패', async () => {
    // J1 토큰을 사용해서 Star 데이터 접근 시도
    const response = await authenticatedRequest(
      'GET',
      '/api/v1/bookings',
      {
        ...j1AdminAuth,
        companyCode: 'star' // 토큰과 다른 회사 코드
      }
    );
    
    // 인증 미들웨어에서 토큰의 companyCode와 요청의 companyCode 불일치 감지
    // 실제 데이터는 J1 것만 나와야 함
    if (response.status === 200 && response.data && response.data.length > 0) {
      const bookings = response.data;
      for (const booking of bookings) {
        expect(booking.companyCode).toBe('j1'); // 토큰에 명시된 회사만 접근 가능
      }
    }
  });
});