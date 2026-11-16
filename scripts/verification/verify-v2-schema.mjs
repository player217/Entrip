import { PrismaClient, Prisma } from '@prisma/client';
import assert from 'node:assert/strict';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('DATABASE_URL must identify a dedicated *_test database.');
}
const prisma = new PrismaClient();
try {
  const models = [];
  for (const model of Prisma.dmmf.datamodel.models) {
    const delegate = model.name[0].toLowerCase() + model.name.slice(1);
    await prisma[delegate].findMany({ take: 2 });
    models.push(model.name);
  }
  assert.equal(models.length, 35);
  const unvalidated = await prisma.$queryRawUnsafe("SELECT count(*)::int AS count FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' AND NOT convalidated");
  assert.equal(unvalidated[0].count, 0);
  const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE schemaname='entrip_legacy_20261117' AND tablename NOT LIKE '\\_%' ORDER BY tablename");
  const preserved = [];
  for (const { tablename } of tables) {
    // Table names come from PostgreSQL metadata, and quoted identifiers escape embedded quotes.
    const name = '"' + tablename.replaceAll('"', '""') + '"';
    const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM entrip_legacy_20261117.${name}`);
    const missing = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM entrip_legacy_20261117.${name} old LEFT JOIN public.${name} current ON current.id=old.id WHERE current.id IS NULL`);
    assert.equal(missing[0].count, 0, `${tablename}: a legacy row is missing`);
    preserved.push({ table: tablename, rows: rows[0].count });
  }
  console.log(JSON.stringify({ result: 'PASS', models, unvalidatedForeignKeys: 0, preserved }, null, 2));
} finally {
  await prisma.$disconnect();
}
