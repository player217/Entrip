import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient } from '@prisma/client';
import { IdempotencyManager } from '../src/lib/idempotency';
import { outboxDispatcher } from '../src/lib/outbox-dispatcher';

const prisma = new PrismaClient();

describe('데이터 무결성 테스트', () => {
  let authToken: string;
  let testUserId: string;
  let testCompanyCode: string;

  beforeAll(async () => {
    // Outbox dispatcher 중지 (테스트 환경)
    outboxDispatcher.stop();

    // 테스트 사용자 생성 및 로그인
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@entrip.com',
        password: 'pass1234'
      });

    authToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;
    testCompanyCode = loginResponse.body.user.companyCode;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.booking.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.outbox.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.$disconnect();
  });

  describe('멱등성 키 테스트', () => {
    it('동일한 멱등성 키로 중복 요청 시 같은 응답 반환', async () => {
      const idempotencyKey = 'test-key-' + Date.now();
      const bookingData = {
        customerName: '테스트 고객',
        teamName: '테스트팀',
        destination: '제주도',
        startDate: '2025-03-15',
        endDate: '2025-03-17',
        paxCount: 2,
        totalPrice: 500000,
        createdBy: testUserId
      };

      // 첫 번째 요청
      const response1 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(bookingData)
        .expect(201);

      // 두 번째 요청 (동일한 멱등성 키)
      const response2 = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(bookingData)
        .expect(200); // 기존 응답 반환

      // 동일한 예약 ID 반환 확인
      expect(response1.body.id).toBe(response2.body.id);
      expect(response1.body.bookingNumber).toBe(response2.body.bookingNumber);

      // 데이터베이스에는 하나의 예약만 생성됨
      const bookingsCount = await prisma.booking.count({
        where: { customerName: '테스트 고객' }
      });
      expect(bookingsCount).toBe(1);
    });

    it('동일한 멱등성 키로 다른 내용 요청 시 에러 반환', async () => {
      const idempotencyKey = 'test-key-conflict-' + Date.now();
      
      const bookingData1 = {
        customerName: '고객1',
        teamName: '팀1',
        destination: '부산',
        startDate: '2025-03-20',
        endDate: '2025-03-22',
        paxCount: 1,
        totalPrice: 300000,
        createdBy: testUserId
      };

      const bookingData2 = {
        customerName: '고객2', // 다른 내용
        teamName: '팀2',
        destination: '대구',
        startDate: '2025-03-25',
        endDate: '2025-03-27',
        paxCount: 3,
        totalPrice: 600000,
        createdBy: testUserId
      };

      // 첫 번째 요청
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(bookingData1)
        .expect(201);

      // 두 번째 요청 (같은 키, 다른 내용)
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(bookingData2)
        .expect(409); // Conflict
    });

    it('멱등성 키 없이도 정상 동작', async () => {
      const bookingData = {
        customerName: '일반 고객',
        teamName: '일반팀',
        destination: '강릉',
        startDate: '2025-04-01',
        endDate: '2025-04-03',
        paxCount: 4,
        totalPrice: 800000,
        createdBy: testUserId
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.customerName).toBe('일반 고객');
      expect(response.body.id).toBeDefined();
    });
  });

  describe('트랜잭션 무결성 테스트', () => {
    it('예약 생성 실패 시 관련 데이터도 롤백', async () => {
      // 잘못된 데이터로 트랜잭션 실패 유도
      const invalidBookingData = {
        customerName: '트랜잭션 테스트',
        teamName: '테스트팀',
        destination: '서울',
        startDate: 'invalid-date', // 잘못된 날짜 형식
        endDate: '2025-05-05',
        paxCount: -1, // 음수 (CHECK 제약 위반)
        totalPrice: 400000,
        createdBy: testUserId
      };

      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBookingData)
        .expect(400);

      // 실패한 예약이 생성되지 않았는지 확인
      const bookingCount = await prisma.booking.count({
        where: { customerName: '트랜잭션 테스트' }
      });
      expect(bookingCount).toBe(0);
    });

    it('대량 생성 실패 시 전체 롤백', async () => {
      const bulkBookings = [
        {
          customerName: '고객1',
          departureDate: '2025-06-01',
          endDate: '2025-06-03',
          destination: '제주',
          totalPrice: 500000
        },
        {
          customerName: '고객2',
          departureDate: 'invalid-date', // 실패 유도
          endDate: '2025-06-05',
          destination: '부산',
          totalPrice: 300000
        }
      ];

      await request(app)
        .post('/api/bookings/bulk-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bookings: bulkBookings })
        .expect(400);

      // 성공한 것도 포함해서 아무것도 생성되지 않았는지 확인
      const count1 = await prisma.booking.count({
        where: { customerName: '고객1' }
      });
      const count2 = await prisma.booking.count({
        where: { customerName: '고객2' }
      });

      expect(count1).toBe(0);
      expect(count2).toBe(0);
    });
  });

  describe('Outbox 패턴 테스트', () => {
    it('예약 생성 시 Outbox 메시지 생성', async () => {
      const bookingData = {
        customerName: 'Outbox 테스트',
        teamName: '테스트팀',
        destination: '인천',
        startDate: '2025-07-01',
        endDate: '2025-07-03',
        paxCount: 2,
        totalPrice: 600000,
        email: 'test@example.com',
        createdBy: testUserId
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      // Outbox 메시지 확인
      const outboxMessages = await prisma.outbox.findMany({
        where: {
          topic: 'booking:created',
          payload: {
            path: ['bookingId'],
            equals: response.body.id
          }
        }
      });

      expect(outboxMessages).toHaveLength(1);
      expect(outboxMessages[0].topic).toBe('booking:created');

      // 이메일 알림 메시지도 생성되었는지 확인
      const emailMessages = await prisma.outbox.findMany({
        where: {
          topic: 'notification:email',
          payload: {
            path: ['to'],
            equals: 'test@example.com'
          }
        }
      });

      expect(emailMessages).toHaveLength(1);
    });

    it('예약 수정 시 변경 사항 추적', async () => {
      // 예약 생성
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: '수정 테스트',
          teamName: '테스트팀',
          destination: '대전',
          startDate: '2025-08-01',
          endDate: '2025-08-03',
          paxCount: 1,
          totalPrice: 300000,
          createdBy: testUserId
        })
        .expect(201);

      const bookingId = response.body.id;

      // 예약 수정
      await request(app)
        .patch(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: '수정된 고객명',
          totalPrice: 350000
        })
        .expect(200);

      // Outbox 업데이트 메시지 확인
      const updateMessages = await prisma.outbox.findMany({
        where: {
          topic: 'booking:updated',
          payload: {
            path: ['bookingId'],
            equals: bookingId
          }
        }
      });

      expect(updateMessages).toHaveLength(1);
      expect(updateMessages[0].payload.changes).toContain('customerName');
      expect(updateMessages[0].payload.changes).toContain('totalPrice');
    });
  });

  describe('감사 로그 테스트', () => {
    it('모든 CRUD 작업에 대한 감사 로그 생성', async () => {
      // 생성
      const createResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerName: '감사 로그 테스트',
          teamName: '테스트팀',
          destination: '광주',
          startDate: '2025-09-01',
          endDate: '2025-09-03',
          paxCount: 3,
          totalPrice: 700000,
          createdBy: testUserId
        })
        .expect(201);

      const bookingId = createResponse.body.id;

      // 수정
      await request(app)
        .patch(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ customerName: '수정된 이름' })
        .expect(200);

      // 삭제
      await request(app)
        .delete(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 감사 로그 확인
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityId: bookingId
        },
        orderBy: { createdAt: 'asc' }
      });

      expect(auditLogs).toHaveLength(3);
      expect(auditLogs[0].action).toBe('CREATE');
      expect(auditLogs[1].action).toBe('UPDATE');
      expect(auditLogs[2].action).toBe('DELETE');

      // 각 로그에 적절한 세부 정보가 있는지 확인
      expect(auditLogs[0].detail.bookingNumber).toBeDefined();
      expect(auditLogs[1].detail.changes).toBeDefined();
      expect(auditLogs[2].detail.deletedData).toBeDefined();
    });

    it('대량 작업에 대한 감사 로그', async () => {
      const bulkBookings = [
        {
          customerName: '대량1',
          departureDate: '2025-10-01',
          endDate: '2025-10-03',
          destination: '울산',
          totalPrice: 400000
        },
        {
          customerName: '대량2',
          departureDate: '2025-10-05',
          endDate: '2025-10-07',
          destination: '천안',
          totalPrice: 350000
        }
      ];

      const response = await request(app)
        .post('/api/bookings/bulk-upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bookings: bulkBookings })
        .expect(200);

      // 각 예약에 대한 감사 로그 확인
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: 'BULK_CREATE',
          actorId: testUserId
        }
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);
      
      // 대량 작업 요약 로그도 확인
      const bulkOutboxMessage = await prisma.outbox.findFirst({
        where: {
          topic: 'booking:bulk_created'
        }
      });

      expect(bulkOutboxMessage).toBeTruthy();
      expect(bulkOutboxMessage.payload.count).toBe(2);
    });
  });

  describe('데이터베이스 제약 조건 테스트', () => {
    it('CHECK 제약 조건 위반 시 에러', async () => {
      const invalidBookings = [
        // 음수 가격
        {
          customerName: '제약 테스트 1',
          teamName: '테스트팀',
          destination: '목적지',
          startDate: '2025-11-01',
          endDate: '2025-11-03',
          paxCount: 2,
          totalPrice: -1000, // CHECK 위반
          createdBy: testUserId
        },
        // 음수 인원
        {
          customerName: '제약 테스트 2',
          teamName: '테스트팀',
          destination: '목적지',
          startDate: '2025-11-01',
          endDate: '2025-11-03',
          paxCount: -1, // CHECK 위반
          totalPrice: 500000,
          createdBy: testUserId
        },
        // 음수 숙박일
        {
          customerName: '제약 테스트 3',
          teamName: '테스트팀',
          destination: '목적지',
          startDate: '2025-11-01',
          endDate: '2025-11-03',
          paxCount: 2,
          nights: -1, // CHECK 위반
          totalPrice: 500000,
          createdBy: testUserId
        }
      ];

      for (const booking of invalidBookings) {
        await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(booking)
          .expect(400);
      }

      // 모든 잘못된 예약이 생성되지 않았는지 확인
      const count = await prisma.booking.count({
        where: {
          customerName: {
            startsWith: '제약 테스트'
          }
        }
      });

      expect(count).toBe(0);
    });

    it('필수 필드 누락 시 에러', async () => {
      const incompleteBookings = [
        // customerName 누락
        {
          teamName: '테스트팀',
          destination: '목적지',
          startDate: '2025-12-01',
          endDate: '2025-12-03',
          paxCount: 2,
          totalPrice: 500000,
          createdBy: testUserId
        },
        // 필수 날짜 누락
        {
          customerName: '필수 필드 테스트',
          teamName: '테스트팀',
          destination: '목적지',
          paxCount: 2,
          totalPrice: 500000,
          createdBy: testUserId
        }
      ];

      for (const booking of incompleteBookings) {
        await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(booking)
          .expect(400);
      }
    });
  });

  describe('동시성 테스트', () => {
    it('동일한 멱등성 키로 동시 요청 시 하나만 성공', async () => {
      const idempotencyKey = 'concurrent-test-' + Date.now();
      const bookingData = {
        customerName: '동시성 테스트',
        teamName: '테스트팀',
        destination: '평택',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        paxCount: 1,
        totalPrice: 200000,
        createdBy: testUserId
      };

      // 동시 요청 10개
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .set('Idempotency-Key', idempotencyKey)
          .send(bookingData)
      );

      const responses = await Promise.all(promises);

      // 하나는 201 (생성), 나머지는 200 (기존 응답)
      const createdResponses = responses.filter(r => r.status === 201);
      const cachedResponses = responses.filter(r => r.status === 200);

      expect(createdResponses).toHaveLength(1);
      expect(cachedResponses).toHaveLength(9);

      // 모든 응답이 같은 예약 ID를 가져야 함
      const bookingIds = responses.map(r => r.body.id);
      const uniqueIds = [...new Set(bookingIds)];
      expect(uniqueIds).toHaveLength(1);

      // 데이터베이스에는 하나의 예약만 존재
      const dbCount = await prisma.booking.count({
        where: { customerName: '동시성 테스트' }
      });
      expect(dbCount).toBe(1);
    });
  });
});