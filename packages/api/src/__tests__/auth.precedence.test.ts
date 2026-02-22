import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { authService } from '../routes/auth/auth.service';

describe('Auth precedence: Cookie vs Authorization', () => {
  const companyCode = 'entrip';
  const password = 'pass1234';
  const emailCookie = `cookie_wins_${Date.now()}@entrip.com`;
  const emailHeader = `header_loses_${Date.now()}@entrip.com`;
  let tokenCookie: string;
  let tokenHeader: string;

  beforeAll(async () => {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.deleteMany({ where: { email: { in: [emailCookie, emailHeader] }, companyCode } });

    const [uCookie, uHeader] = await Promise.all([
      prisma.user.create({
        data: { email: emailCookie, name: 'Cookie Wins', password: hashed, role: UserRole.ADMIN, companyCode, isActive: true },
      }),
      prisma.user.create({
        data: { email: emailHeader, name: 'Header Loses', password: hashed, role: UserRole.MANAGER, companyCode, isActive: true },
      }),
    ]);

    tokenCookie = authService.generateTokens(uCookie as any).accessToken;
    tokenHeader = authService.generateTokens(uHeader as any).accessToken;
  });

  it('uses cookie token when both Cookie and Authorization are present (cookie is SSOT)', async () => {
    const res = await request(app)
      .get('/api/v2/auth/me')
      .set('Cookie', `auth-token=${tokenCookie}`)
      .set('Authorization', `Bearer ${tokenHeader}`)
      .expect(200);

    const returnedEmail = res.body?.data?.user?.email;
    expect(returnedEmail).toBe(emailCookie);
  });
});

