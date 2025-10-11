/**
 * Booking optimistic locking + ETag/If-Match contract tests (skipped placeholder)
 * TODO: implement with supertest against running v2 server and seeded DB
 */

import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

describe('Bookings ETag/If-Match contracts', () => {
  const email = 'locktest@j1.com';
  const companyCode = 'j1';
  const password = 'pass1234';
  let agent: any;
  let bookingId: string;

  const createUserAndLogin = async () => {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name: 'Lock Tester',
        password: hashed,
        role: 'ADMIN',
        companyCode,
        isActive: true,
      },
    });

    agent = request.agent(app);
    await agent.post('/api/v2/auth/login').send({ email, password, companyCode }).expect(200);
  };

  const createBooking = async () => {
    const createRes = await agent
      .post('/api/v2/bookings')
      .send({
        teamName: 'Team A',
        type: 'incentive',
        origin: 'Seoul',
        destination: 'Tokyo',
        startDate: '2025-10-01',
        endDate: '2025-10-02',
        totalPax: 5,
        coordinator: 'Alice',
      })
      .expect(201);
    bookingId = createRes.body?.data?.id;
  };

  beforeEach(async () => {
    await createUserAndLogin();
    await createBooking();
  });

  it('performs ETag/If-Match flow end-to-end', async () => {
    // 1) GET includes ETag
    const res = await agent.get(`/api/v2/bookings/${bookingId}`).expect(200);
    expect(res.headers['etag']).toBeTruthy();

    // 2) PUT without If-Match → 428
    await agent.put(`/api/v2/bookings/${bookingId}`).send({ notes: 'no if-match' }).expect(428);

    // 3) PUT with stale If-Match → 412
    const res1 = await agent.get(`/api/v2/bookings/${bookingId}`).expect(200);
    const currentVersion = String(res1.body?.data?.version ?? '');

    // bump version
    const res2 = await agent
      .put(`/api/v2/bookings/${bookingId}`)
      .set('If-Match', currentVersion)
      .send({ notes: 'v1' })
      .expect(200);
    expect(res2.body?.data?.notes).toBe('v1');

    // stale update attempt
    await agent
      .put(`/api/v2/bookings/${bookingId}`)
      .set('If-Match', currentVersion)
      .send({ notes: 'stale' })
      .expect(412);
  });

  it('rejects weak ETag format in If-Match (expects numeric version)', async () => {
    const res = await agent.get(`/api/v2/bookings/${bookingId}`).expect(200);
    expect(res.headers['etag']).toMatch(/^W\/\"/);

    // Send a weak ETag back instead of numeric version → 428
    await agent
      .put(`/api/v2/bookings/${bookingId}`)
      .set('If-Match', String(res.headers['etag']))
      .send({ notes: 'should-fail' })
      .expect(428);
  });

  it('deleteWithLock second call returns 412 (version mismatch/idempotency via guard)', async () => {
    // Fetch current version
    const res = await agent.get(`/api/v2/bookings/${bookingId}`).expect(200);
    const version = String(res.body?.data?.version ?? '');

    // First delete succeeds
    await agent.delete(`/api/v2/bookings/${bookingId}`).set('If-Match', version).expect(204);

    // Second delete with same If-Match → no matching row (deletedAt set) → 412
    await agent.delete(`/api/v2/bookings/${bookingId}`).set('If-Match', version).expect(412);
  });
});
