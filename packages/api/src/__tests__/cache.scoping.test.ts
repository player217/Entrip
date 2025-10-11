import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { BookingType, UserRole } from '@prisma/client';
import { authService } from '../routes/auth/auth.service';

describe('Cache scoping with authenticated GETs', () => {
  const companyCode = 'entrip';
  const password = 'pass1234';
  const emailA = `cache_user_a_${Date.now()}@entrip.com`;
  const emailB = `cache_user_b_${Date.now()}@entrip.com`;
  let accessTokenA: string;
  let accessTokenB: string;

  beforeAll(async () => {
    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] }, companyCode } });

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: { email: emailA, name: 'Cache A', password: hashed, role: UserRole.ADMIN, companyCode, isActive: true },
      }),
      prisma.user.create({
        data: { email: emailB, name: 'Cache B', password: hashed, role: UserRole.MANAGER, companyCode, isActive: true },
      }),
    ]);

    accessTokenA = authService.generateTokens(userA as any).accessToken;
    accessTokenB = authService.generateTokens(userB as any).accessToken;

    // Seed a booking visible to both users (same company)
    const now = new Date();
    await prisma.booking.create({
      data: {
        bookingNumber: `CS${Date.now()}`,
        teamName: 'CacheScope',
        teamType: 'group',
        type: BookingType.FIT,
        origin: 'ICN',
        destination: 'NRT',
        startDate: new Date(now.getTime() + 24 * 3600 * 1000),
        endDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
        totalPax: 3,
        coordinator: 'CacheScope Bot',
        companyCode,
      },
    });
  });

  it('returns MISS then HIT for the same user on identical GET', async () => {
    const agent = request.agent(app);
    const path = '/api/v2/team-bookings?page=1&pageSize=1';
    const runId = `cache-scope-${Date.now()}`;

    const first = await agent
      .get(path)
      .set('Cookie', `auth-token=${accessTokenA}`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(first.headers['x-cache-status']).toBe('MISS');

    const second = await agent
      .get(path)
      .set('Cookie', `auth-token=${accessTokenA}`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(second.headers['x-cache-status']).toBe('HIT');
  });

  it('does not HIT cache for a different user on the same GET (scoped key)', async () => {
    const agent = request.agent(app);
    const path = '/api/v2/team-bookings?page=1&pageSize=1';
    const runId = `cache-scope-${Date.now()}-b`;

    const res = await agent
      .get(path)
      .set('Cookie', `auth-token=${accessTokenB}`)
      .set('Authorization', `Bearer ${accessTokenB}`)
      .set('X-Test-Run-Id', runId)
      .expect(200);

    expect(res.headers['x-cache-status']).toBe('MISS');
  });
});

