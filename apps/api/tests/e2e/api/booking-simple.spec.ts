import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:4000';

// Simple JWT token for testing
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NTI0NjkxNjF9.SA2b4m30lstngdeVnog6jPFJ1KX6QZrslsPcqLpjFAM';

test.describe('Booking API Basic Tests', () => {
  test('1. 인증 없이 접근 시 401 에러', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/bookings`);
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('No token provided');
  });

  test('2. 인증된 사용자는 예약 목록 조회 가능', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    
    // 응답 구조 확인
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // 최소 3개 이상의 데이터 확인
    expect(data.pagination.total).toBeGreaterThanOrEqual(3);
    
    // 첫 번째 예약 데이터 구조 확인
    if (data.data.length > 0) {
      const booking = data.data[0];
      expect(booking).toHaveProperty('id');
      expect(booking).toHaveProperty('bookingNumber');
      expect(booking).toHaveProperty('customerName');
      expect(booking).toHaveProperty('status');
    }
  });

  test('3. 잘못된 토큰으로 접근 시 401 에러', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/bookings`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid token');
  });
});