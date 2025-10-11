import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index';
import prisma from '../lib/prisma';

describe('Notifications security and concurrency', () => {
  const password = 'pass1234';
  const userJ1 = { email: 'notify_j1@test.com', companyCode: 'j1', name: 'J1 User' };
  const userEN = { email: 'notify_en@test.com', companyCode: 'entrip', name: 'EN User' };

  let agentJ1: any;
  let j1UserId: string;
  let enUserId: string;

  beforeEach(async () => {
    const hashed = await bcrypt.hash(password, 10);
    const u1 = await prisma.user.create({ data: { ...userJ1, password: hashed, role: 'ADMIN', isActive: true } as any });
    j1UserId = u1.id;
    const u2 = await prisma.user.create({ data: { ...userEN, password: hashed, role: 'ADMIN', isActive: true } as any });
    enUserId = u2.id;

    // Login as J1 user
    agentJ1 = request.agent(app);
    await agentJ1.post('/api/v2/auth/login').send({ email: userJ1.email, password, companyCode: userJ1.companyCode }).expect(200);
  });

  it('denies cross-company notification access (404)', async () => {
    // Seed a notification for entrip user
    const other = await prisma.notification.create({
      data: {
        userId: enUserId,
        companyCode: 'entrip',
        title: 'Secret',
        message: 'EN only',
        type: 'SYSTEM_ALERT' as any,
        priority: 'NORMAL' as any,
        isRead: false,
      },
    });

    // J1 user attempts to read it → 404 (not found in their scope)
    await agentJ1.get(`/api/v2/notifications/${other.id}`).expect(404);
  });

  it('markAllAsRead is idempotent under concurrency', async () => {
    // Seed unread notifications for j1 user
    const batch = Array.from({ length: 5 }).map((_, i) =>
      prisma.notification.create({
        data: {
          userId: j1UserId,
          companyCode: 'j1',
          title: `Msg ${i}`,
          message: `M${i}`,
          type: 'MESSAGE_RECEIVED' as any,
          priority: 'NORMAL' as any,
          isRead: false,
        },
      })
    );
    await Promise.all(batch);

    // Fire 3 concurrent markAll calls with same filter
    const body = { type: 'MESSAGE_RECEIVED' };
    const [r1, r2, r3] = await Promise.all([
      agentJ1.patch('/api/v2/notifications/read-all').send(body),
      agentJ1.patch('/api/v2/notifications/read-all').send(body),
      agentJ1.patch('/api/v2/notifications/read-all').send(body),
    ]);

    // At least one updatedCount should be >= 1, others may be 0
    const counts = [r1.body?.data?.updatedCount ?? 0, r2.body?.data?.updatedCount ?? 0, r3.body?.data?.updatedCount ?? 0];
    expect(counts.some((c) => c >= 1)).toBeTruthy();

    // Verify no unread remain for that type
    const unread = await agentJ1.get('/api/v2/notifications/unread-count').expect(200);
    const byType = unread.body?.data?.byType || {};
    expect((byType['MESSAGE_RECEIVED'] || 0)).toBe(0);
  });
});
