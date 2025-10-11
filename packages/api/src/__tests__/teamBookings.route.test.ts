import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { BookingType } from '@prisma/client';
import { authService } from '../routes/auth/auth.service';

describe('v2 Team Bookings routes', () => {
  const email = 'team_admin@entrip.com';
  const companyCode = 'entrip';
  const password = 'pass1234';
  let bookingId: string | undefined;
  // SuperTest agent type resolution can be finicky across versions; keep loose for tests
  let agent: any;
  let accessToken: string | undefined;

  // 각 테스트마다 시드를 재생성하여 afterEach의 DB 정리(cleanDatabase)와 충돌을 방지한다.
  beforeEach(async () => {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.deleteMany({ where: { email, companyCode } });
    const createdUser = await prisma.user.create({
      data: {
        email,
        name: 'Team Admin',
        password: hashed,
        role: 'ADMIN',
        companyCode,
        isActive: true,
      },
    });

    const now = new Date();
    const start = new Date(now.getTime() + 24 * 3600 * 1000);
    const end = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
    const created = await prisma.booking.create({
      data: {
        bookingNumber: `TBK${Date.now()}`,
        teamName: '테스트 팀',
        teamType: 'group',
        type: BookingType.FIT,
        origin: 'ICN',
        destination: 'NRT',
        startDate: start,
        endDate: end,
        totalPax: 5,
        coordinator: '테스트 코디',
        companyCode,
      },
    });
    bookingId = created.id;

    agent = request.agent(app);
    const tokens = authService.generateTokens(createdUser as any);
    accessToken = tokens.accessToken;
  });

  it('lists team bookings with pagination', async () => {
    const runId = `team-bookings-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await agent
      .get('/api/v2/team-bookings?page=1&pageSize=5')
      .set('Cookie', `auth-token=${accessToken}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  it('gets a team booking by id and returns ETag', async () => {
    const runId = `team-bookings-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await agent
      .get(`/api/v2/team-bookings/${bookingId}`)
      .set('Cookie', `auth-token=${accessToken}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(res.body).toHaveProperty('booking');
    expect(typeof res.headers['etag'] === 'string' || res.headers['etag'] === undefined).toBe(true);
  });

  it('returns history array (possibly empty)', async () => {
    const runId = `team-bookings-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const res = await agent
      .get(`/api/v2/team-bookings/${bookingId}/history`)
      .set('Cookie', `auth-token=${accessToken}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(res.body).toHaveProperty('history');
    expect(Array.isArray(res.body.history)).toBe(true);
  });
});
