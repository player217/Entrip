import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { rateLimiter } from '../middlewares/rateLimit.middleware';
jest.setTimeout(30000);
const database = new URL(process.env.TEST_DATABASE_URL!);
if (!database.pathname.endsWith('_test')) throw new Error('Refusing to clean a non-test database.');
async function cleanDatabase() {
  if (database.protocol === 'file:') {
    // SQLite has no TRUNCATE. Defer foreign keys while clearing related fixtures together.
    const models = Prisma.dmmf.datamodel.models;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('PRAGMA defer_foreign_keys = ON');
      for (const model of [...models].reverse()) {
        const table = (model.dbName || model.name).replace(/"/g, '""');
        await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
      }
    });
    return;
  }
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
