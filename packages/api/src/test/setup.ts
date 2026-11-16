import prisma from '../lib/prisma';
import { rateLimiter } from '../middlewares/rateLimit.middleware';
jest.setTimeout(30000);
const database = new URL(process.env.TEST_DATABASE_URL!).pathname;
if (!database.endsWith('_test')) throw new Error('Refusing to clean a non-test database.');
async function cleanDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const names = tables.map(({ tablename }) => '"' + tablename.replace(/"/g, '""') + '"').join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
  }
}
beforeAll(async () => { await prisma.$connect(); await cleanDatabase(); });
afterEach(async () => { await cleanDatabase(); rateLimiter.clear(); });
afterAll(async () => { await prisma.$disconnect(); });
export { prisma };
