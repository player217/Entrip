import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { authService } from '../routes/auth/auth.service';

describe('session role and company integrity', () => {
  const email = 'auth-regression@entrip.com';
  beforeEach(async () => {
    await prisma.user.create({ data: { email, name: 'Auth regression', password: await bcrypt.hash('pass1234', 4), role: UserRole.ADMIN, companyCode: 'entrip', isActive: true } });
  });
  it('resolves company aliases to the canonical seeded company', async () => {
    const result = await authService.login({ email, password: 'pass1234', companyCode: 'ENTRIP_MAIN' }, 'ENTRIP_MAIN');
    expect(result.user.companyCode).toBe('entrip');
  });
  it('rejects valid credentials for another company', async () => {
    await expect(authService.login({ email, password: 'pass1234', companyCode: 'j1' }, 'j1')).rejects.toMatchObject({ statusCode: 401 });
  });
  it('uses current database role after a token was issued', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    const token = authService.generateTokens(user).accessToken;
    await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.USER } });
    expect((await authService.verifyAccessToken(token)).role).toBe(UserRole.USER);
  });
  it('rejects an already issued token immediately after disabling user', async () => {
    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    const token = authService.generateTokens(user).accessToken;
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    await expect(authService.verifyAccessToken(token)).rejects.toMatchObject({ statusCode: 401 });
  });
  it.each([UserRole.ADMIN, UserRole.MANAGER])('rejects public registration requesting %s privileges', async role => {
    await expect(authService.register({ email: 'escalation@entrip.com', name: 'Escalation', password: 'pass1234', role }, 'entrip')).rejects.toMatchObject({ statusCode: 403 });
    expect(await prisma.user.count({ where: { email: 'escalation@entrip.com' } })).toBe(0);
  });
});
