import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

describe('Auth login companyCode enforcement', () => {
  const email = 'test_admin@j1.com';
  const companyCode = 'j1';
  const password = 'pass1234';
  let userId: string;

  beforeEach(async () => {
    // Create user if not exists
    const hashed = await bcrypt.hash(password, 10);
    let user = await prisma.user.findFirst({ where: { email, companyCode } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: 'Test Admin',
          password: hashed,
          role: 'ADMIN',
          companyCode,
          isActive: true,
        },
      });
    }
    userId = user.id;
  });

  afterAll(async () => {
    // leave user in DB for other tests; do not delete
  });

  // Run success case first to avoid rate-limit interference from invalid attempts
  it('succeeds with correct companyCode', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .send({ email, password, companyCode })
      .expect(200);
    expect(res.body?.user?.email).toBe(email);
  });

  it('fails without companyCode', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .send({ email, password })
      .expect(400);
    expect(res.body).toBeDefined();
  });

  it('rejects valid email/password but wrong companyCode (or rate-limits)', async () => {
    const res = await request(app)
      .post('/api/v2/auth/login')
      .send({ email, password, companyCode: 'entrip' });
    expect([401, 429]).toContain(res.status);
  });
});
