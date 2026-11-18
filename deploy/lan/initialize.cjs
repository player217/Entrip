const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const apiRequire = createRequire(path.join(root, 'packages/api/package.json'));
const { PrismaClient } = apiRequire('@prisma/client');
const bcrypt = apiRequire('bcryptjs');

async function createFirstAdmin(prisma, env) {
  const companyCode = (env.ENTRIP_COMPANY_CODE || 'entrip').trim();
  const email = (env.ENTRIP_ADMIN_EMAIL || '').trim();
  const password = env.ENTRIP_ADMIN_PASSWORD || '';
  if (!companyCode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Invalid initial administrator credentials in the local server configuration.');
  }
  await prisma.$transaction(async tx => {
    // Serialize the empty-directory check and insert across concurrent starts.
    await tx.$executeRaw`LOCK TABLE "User" IN SHARE ROW EXCLUSIVE MODE`;
    if (await tx.user.count()) {
      console.log('Existing employee directory preserved.');
      return;
    }
    await tx.user.create({ data: {
      companyCode, email, name: 'Entrip 관리자', role: 'ADMIN', password: await bcrypt.hash(password, 12),
    } });
    console.log('Initial administrator created.');
  });
}

async function main() {
  const migration = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'),
    'migrate', 'deploy', '--schema', path.join(root, 'packages/api/prisma/schema.prisma')], { stdio: 'inherit' });
  if (migration.error) throw migration.error;
  if (migration.status !== 0) throw new Error(`Database migration failed (${migration.status}).`);
  const prisma = new PrismaClient();
  try { await createFirstAdmin(prisma, process.env); }
  finally { await prisma.$disconnect(); }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createFirstAdmin };
