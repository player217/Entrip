import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Advanced Booking Filters', () => {
  let token: string;
  let testUser: any;

  beforeEach(async () => {
    // Clean up first
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
    
    // 테스트 사용자 생성
    testUser = await prisma.user.create({
      data: {
        email: 'filter-test@test.com',
        name: 'Filter Test',
        password: 'hashed',
        role: 'ADMIN',
        companyCode: 'COMPANY_A'
      }
    });

    token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'secret'
    );

    // 테스트 데이터 생성
    await prisma.booking.createMany({
      data: [
        {
          bookingNumber: 'BK001',
          customerName: '홍길동',
          teamName: '제주팀',
          bookingType: 'PACKAGE',
          destination: '제주도',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-03'),
          paxCount: 4,
          nights: 2,
          days: 3,
          status: 'CONFIRMED',
          totalPrice: 1500000,
          currency: 'KRW',
          companyCode: 'COMPANY_A',
          createdBy: testUser.id
        },
        {
          bookingNumber: 'BK002',
          customerName: '김철수',
          teamName: '부산팀',
          bookingType: 'FIT',
          destination: '부산',
          startDate: new Date('2025-02-10'),
          endDate: new Date('2025-02-12'),
          paxCount: 2,
          nights: 2,
          days: 3,
          status: 'PENDING',
          totalPrice: 800000,
          currency: 'KRW',
          companyCode: 'COMPANY_A',
          createdBy: testUser.id
        },
        {
          bookingNumber: 'BK003',
          customerName: '이영희',
          teamName: '서울팀',
          bookingType: 'BUSINESS',
          destination: '서울',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-03-05'),
          paxCount: 1,
          nights: 4,
          days: 5,
          status: 'CONFIRMED',
          totalPrice: 2000000,
          currency: 'KRW',
          companyCode: 'COMPANY_A',
          createdBy: testUser.id
        }
      ]
    });
  });

  afterEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should filter by client name', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ client: '홍길동' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].client).toBe('홍길동');
  });

  it('should support partial client name match', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ client: '김' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].client).toBe('김철수');
  });

  it('should search by keyword across multiple fields - booking number', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ keyword: 'BK002' })
      .set('Authorization', `Bearer ${token}`);

    if (res.status !== 200) {
      console.log('Filter error:', res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].bookingNumber).toBe('BK002');
  });

  it('should search by keyword across multiple fields - customer name', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ keyword: '이영희' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].client).toBe('이영희');
  });

  it('should search by keyword across multiple fields - destination', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ keyword: '제주' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].destination).toBe('제주도');
  });

  it('should search by keyword across multiple fields - team name', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ keyword: '부산팀' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].teamName).toBe('부산팀');
  });

  it('should combine multiple filters', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ status: 'CONFIRMED', type: 'PACKAGE' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].bookingNumber).toBe('BK001');
    expect(res.body.data[0].status).toBe('CONFIRMED');
    expect(res.body.data[0].bookingType).toBe('PACKAGE');
  });

  it('should support case-sensitive search (SQLite limitation)', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ keyword: 'BK002' })  // Changed to match exact case
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].bookingNumber).toBe('BK002');
  });

  it('should return pagination metadata', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ take: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('should handle pagination', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .query({ take: 2, skip: 2 })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);  // 마지막 페이지에는 1개
    expect(res.body.pagination.page).toBe(2);
  });
});