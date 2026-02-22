import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// 테스트용 JWT 토큰 생성 헬퍼
const generateToken = (role: 'ADMIN' | 'MANAGER' | 'USER' = 'ADMIN') => {
  return jwt.sign(
    { id: 'test-user-id', email: 'test@test.com', role },
    process.env.JWT_SECRET || 'secret'
  );
};

describe('Booking API with RBAC', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let testBookingId: string;

  beforeAll(async () => {
    // Empty beforeAll - tokens are generated in beforeEach
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
    
    // 테스트용 사용자 생성 (id를 자동 생성)
    const testUser = await prisma.user.create({
      data: {
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed',
        role: 'ADMIN',
        companyCode: 'COMPANY_A'
      }
    });
    
    // JWT 토큰에 실제 사용자 ID 사용
    adminToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'ADMIN' },
      process.env.JWT_SECRET || 'secret'
    );
    managerToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'MANAGER' },
      process.env.JWT_SECRET || 'secret'
    );
    userToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'USER' },
      process.env.JWT_SECRET || 'secret'
    );
  });

  afterAll(async () => {
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('should allow ADMIN to create booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Test Client',
        teamName: 'Test Team',
        bookingType: 'PACKAGE',
        destination: 'Seoul',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-05T00:00:00.000Z',
        paxCount: 2,
        nights: 4,
        days: 5,
        totalPrice: 1000000,
        currency: 'KRW'
      });

    if (res.status !== 201) {
      console.log('Create booking error:', res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body.customerName).toBe('Test Client');
    testBookingId = res.body.id;
  });

  it('should allow MANAGER to create booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        customerName: 'Manager Client',
        teamName: 'Manager Team',
        bookingType: 'FIT',
        destination: 'Busan',
        startDate: '2025-03-01T00:00:00.000Z',
        endDate: '2025-03-05T00:00:00.000Z',
        paxCount: 3,
        nights: 4,
        days: 5,
        totalPrice: 2000000,
        currency: 'KRW'
      });

    expect(res.status).toBe(201);
    expect(res.body.customerName).toBe('Manager Client');
  });

  it('should deny USER from creating booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        customerName: 'User Client',
        teamName: 'User Team',
        bookingType: 'GROUP',
        destination: 'Jeju',
        startDate: '2025-04-01T00:00:00.000Z',
        endDate: '2025-04-05T00:00:00.000Z',
        paxCount: 5,
        nights: 4,
        days: 5,
        totalPrice: 3000000,
        currency: 'KRW'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  it('should require authentication for GET requests', async () => {
    const res = await request(app)
      .get('/api/bookings');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('should allow authenticated USER to view bookings', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should allow ADMIN to update booking', async () => {
    // 먼저 예약 생성
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Test Client',
        teamName: 'Test Team',
        bookingType: 'PACKAGE',
        destination: 'Seoul',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-05T00:00:00.000Z',
        paxCount: 2,
        nights: 4,
        days: 5,
        totalPrice: 1000000,
        currency: 'KRW'
      });

    const bookingId = createRes.body.id;

    // 예약 수정
    const updateRes = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Updated Client',
        totalPrice: 1500000
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.customerName).toBe('Updated Client');
    expect(Number(updateRes.body.totalPrice)).toBe(1500000);
  });

  it('should deny USER from updating booking', async () => {
    // 먼저 예약 생성
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Test Client',
        teamName: 'Test Team',
        bookingType: 'PACKAGE',
        destination: 'Seoul',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-05T00:00:00.000Z',
        paxCount: 2,
        nights: 4,
        days: 5,
        totalPrice: 1000000,
        currency: 'KRW'
      });

    const bookingId = createRes.body.id;

    // USER가 수정 시도
    const updateRes = await request(app)
      .patch(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        customerName: 'Updated Client'
      });

    expect(updateRes.status).toBe(403);
    expect(updateRes.body.error).toBe('Insufficient permissions');
  });

  it('should allow only ADMIN to delete booking', async () => {
    // 먼저 예약 생성
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Test Client',
        teamName: 'Test Team',
        bookingType: 'PACKAGE',
        destination: 'Seoul',
        startDate: '2025-02-01T00:00:00.000Z',
        endDate: '2025-02-05T00:00:00.000Z',
        paxCount: 2,
        nights: 4,
        days: 5,
        totalPrice: 1000000,
        currency: 'KRW'
      });

    const bookingId = createRes.body.id;

    // MANAGER가 삭제 시도 (실패해야 함)
    const managerDeleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(managerDeleteRes.status).toBe(403);

    // ADMIN이 삭제 (성공해야 함)
    const adminDeleteRes = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminDeleteRes.status).toBe(204);
  });
});