import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:4000';

// Helper function to generate JWT tokens
function generateToken(role: string, userId?: string) {
  return jwt.sign(
    { 
      id: userId || 'test-id', 
      email: `${role.toLowerCase()}@entrip.com`, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    'your-secret-key-here'
  );
}

test.describe('Booking API E2E Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  test.beforeAll(() => {
    // Use actual user IDs from seed data
    adminToken = generateToken('ADMIN', 'cmd2mi9js0000v6k5srdz45n6');
    managerToken = generateToken('MANAGER', 'cmd2mi9ka0001v6k5h4fub36r');
    userToken = generateToken('USER', 'cmd2mi9kg0002v6k558hwt0wy');
  });

  test('시나리오 1: 예약 목록 조회 (인증된 사용자)', async ({ request }) => {
    // 인증 없이 요청 - 실패해야 함
    const noAuthResponse = await request.get(`${API_URL}/api/bookings`);
    expect(noAuthResponse.status()).toBe(401);
    const noAuthData = await noAuthResponse.json();
    expect(noAuthData.error).toBe('No token provided');

    // 인증된 요청 - 성공해야 함
    const authResponse = await request.get(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    expect(authResponse.ok()).toBeTruthy();
    
    const data = await authResponse.json();
    expect(data.data).toBeDefined();
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBeGreaterThanOrEqual(3);
    expect(data.data.length).toBeGreaterThanOrEqual(3);
    
    // 첫 번째 예약 데이터 검증
    const firstBooking = data.data[0];
    expect(firstBooking).toMatchObject({
      bookingNumber: expect.any(String),
      customerName: expect.any(String),
      teamName: expect.any(String),
      bookingType: expect.any(String),
      status: expect.any(String)
    });
  });

  test('시나리오 2: 새 예약 생성 (ADMIN/MANAGER만 가능)', async ({ request }) => {
    const newBooking = {
      customerName: '테스트고객',
      teamName: 'E2E Test Team',
      bookingType: 'GROUP',
      destination: 'ICN',
      startDate: '2025-10-01T00:00:00.000Z',
      endDate: '2025-10-05T00:00:00.000Z',
      paxCount: 10,
      nights: 4,
      days: 5,
      totalPrice: 15000000,
      currency: 'KRW'
    };

    // USER 권한으로 시도 - 실패해야 함
    const userResponse = await request.post(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      data: newBooking
    });
    expect(userResponse.status()).toBe(403);
    const userError = await userResponse.json();
    expect(userError.error).toBe('Insufficient permissions');

    // ADMIN 권한으로 시도 - 성공해야 함
    const adminResponse = await request.post(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: newBooking
    });
    
    // Debug: log the response
    if (!adminResponse.ok()) {
      const error = await adminResponse.json();
      console.log('Create booking failed:', error);
    }
    
    expect(adminResponse.ok()).toBeTruthy();
    
    const createdBooking = await adminResponse.json();
    expect(createdBooking.bookingNumber).toMatch(/^BK\d+$/);
    expect(createdBooking.customerName).toBe('테스트고객');
    expect(createdBooking.status).toBe('PENDING');
    expect(createdBooking.id).toBeDefined();
  });

  test('시나리오 3: 예약 수정 권한 확인', async ({ request }) => {
    // 먼저 예약 목록을 가져와서 첫 번째 예약 ID 확인
    const listResponse = await request.get(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const listData = await listResponse.json();
    const firstBookingId = listData.data[0].id;

    // USER 권한으로 수정 시도 - 실패해야 함
    const userUpdateResponse = await request.patch(`${API_URL}/api/bookings/${firstBookingId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'CANCELLED'
      }
    });
    expect(userUpdateResponse.status()).toBe(403);

    // MANAGER 권한으로 수정 시도 - 성공해야 함
    const managerUpdateResponse = await request.patch(`${API_URL}/api/bookings/${firstBookingId}`, {
      headers: {
        'Authorization': `Bearer ${managerToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'CANCELLED',
        notes: 'E2E 테스트로 취소됨'
      }
    });
    expect(managerUpdateResponse.ok()).toBeTruthy();
    
    const updatedBooking = await managerUpdateResponse.json();
    expect(updatedBooking.status).toBe('CANCELLED');
    expect(updatedBooking.notes).toBe('E2E 테스트로 취소됨');
  });
});

test.describe('Booking API 유효성 검사', () => {
  let adminToken: string;

  test.beforeAll(() => {
    adminToken = generateToken('ADMIN');
  });

  test('잘못된 데이터로 예약 생성 시도', async ({ request }) => {
    const invalidBooking = {
      customerName: '',  // 빈 문자열
      teamName: 'Test',
      bookingType: 'INVALID_TYPE',  // 잘못된 타입
      destination: 'ICN',
      startDate: '2025-10-01T00:00:00.000Z',
      endDate: '2025-09-01T00:00:00.000Z',  // 종료일이 시작일보다 이전
      paxCount: -5,  // 음수
      nights: 4,
      days: 5,
      totalPrice: 'not-a-number',  // 숫자가 아님
      currency: 'KRW'
    };

    const response = await request.post(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      data: invalidBooking
    });
    
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBeDefined();
  });

  test('필터링 및 페이지네이션', async ({ request }) => {
    // 상태별 필터링
    const confirmedResponse = await request.get(`${API_URL}/api/bookings?status=CONFIRMED`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    expect(confirmedResponse.ok()).toBeTruthy();
    const confirmedData = await confirmedResponse.json();
    confirmedData.data.forEach((booking: any) => {
      expect(booking.status).toBe('CONFIRMED');
    });

    // 페이지네이션 - take/skip 테스트
    const pageResponse = await request.get(`${API_URL}/api/bookings?take=2&skip=0`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    expect(pageResponse.ok()).toBeTruthy();
    const pageData = await pageResponse.json();
    expect(pageData.data.length).toBe(2);
    expect(pageData.pagination.limit).toBe(2);
  });
});