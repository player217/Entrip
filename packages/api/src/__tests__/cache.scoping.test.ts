import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import { authService } from '../routes/auth/auth.service';

describe('Booking fresh reads and tenant isolation', () => {
  let tokenA: string;
  let tokenB: string;
  let foreignToken: string;
  let bookingId: string;
  beforeEach(async () => {
    // Global setup cleans the isolated DB after each test, so every case owns its fixtures.
    const [userA, userB, foreign] = await Promise.all([
      prisma.user.create({ data: { email: 'fresh-a@entrip.com', name: 'User A', password: 'unused', role: 'ADMIN', companyCode: 'entrip', isActive: true } }),
      prisma.user.create({ data: { email: 'fresh-b@entrip.com', name: 'User B', password: 'unused', role: 'MANAGER', companyCode: 'entrip', isActive: true } }),
      prisma.user.create({ data: { email: 'fresh@other.com', name: 'Other Company', password: 'unused', role: 'ADMIN', companyCode: 'other', isActive: true } }),
    ]);
    tokenA = authService.generateTokens(userA).accessToken;
    tokenB = authService.generateTokens(userB).accessToken;
    foreignToken = authService.generateTokens(foreign).accessToken;
    const booking = await prisma.booking.create({ data: {
      bookingNumber: 'FRESH-001', teamName: '원래 팀명', type: 'FIT', origin: 'ICN', destination: 'NRT',
      startDate: new Date('2026-12-11'), endDate: new Date('2026-12-14'), totalPax: 3, coordinator: 'User A',
      companyCode: 'entrip', userId: userA.id,
    } });
    bookingId = booking.id;
  });
  const cookie = (token: string) => ({ Cookie: `auth-token=${token}` });

  it('an edit by a colleague is immediately visible in both booking APIs and history', async () => {
    const path = '/api/v2/team-bookings?page=1&pageSize=10';
    const first = await request(app).get(path).set(cookie(tokenA)).expect(200);
    expect(first.body.data[0].teamName).toBe('원래 팀명');
    await request(app).get(`/api/v2/team-bookings/${bookingId}`).set(cookie(tokenA)).expect(200);
    await request(app).get(`/api/v2/team-bookings/${bookingId}/history`).set(cookie(tokenA)).expect(200);
    await request(app).put(`/api/v2/bookings/${bookingId}`).set(cookie(tokenB)).set('If-Match', '1').send({ teamName: '동료가 변경한 팀명' }).expect(200);
    const fresh = await request(app).get(path).set(cookie(tokenA)).expect(200);
    expect(fresh.body.data[0].teamName).toBe('동료가 변경한 팀명');
    const detail = await request(app).get(`/api/v2/team-bookings/${bookingId}`).set(cookie(tokenA)).expect(200);
    expect(detail.body.booking.teamName).toBe('동료가 변경한 팀명');
    expect(detail.body.booking.version).toBe(2);
    const canonical = await request(app).get(`/api/v2/bookings/${bookingId}`).set(cookie(tokenA)).expect(200);
    expect(canonical.body.data.teamName).toBe('동료가 변경한 팀명');
    const history = await request(app).get(`/api/v2/team-bookings/${bookingId}/history`).set(cookie(tokenA)).expect(200);
    expect(history.body.history).toHaveLength(1);
    expect(history.body.history[0].action).toBe('updated');
  });

  it('another company cannot receive a previously read list, detail or history', async () => {
    for (const prefix of ['bookings', 'team-bookings']) {
      const path = `/api/v2/${prefix}?page=1&limit=10`;
      const sameCompany = await request(app).get(path).set(cookie(tokenA)).expect(200);
      expect(sameCompany.body.data).toHaveLength(1);
      const colleague = await request(app).get(path).set(cookie(tokenB)).expect(200);
      expect(colleague.body.data).toHaveLength(1);
      const foreign = await request(app).get(path).set(cookie(foreignToken)).expect(200);
      expect(foreign.body.data).toEqual([]);
      await request(app).get(`/api/v2/${prefix}/${bookingId}`).set(cookie(foreignToken)).expect(404);
    }
    await request(app).get(`/api/v2/team-bookings/${bookingId}/history`).set(cookie(foreignToken)).expect(404);
  });
});
