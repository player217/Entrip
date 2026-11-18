const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../..');
const apiRequire = createRequire(path.join(root, 'packages/api/package.json'));
const sqlite = name => path.join(__dirname, 'sqlite', name);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal}).`);
}

async function createFirstAdmin(prisma, env) {
  await prisma.$transaction(async tx => {
    if (await tx.user.count()) {
      console.log('Existing employee directory preserved.');
      return;
    }
    const companyCode = (env.ENTRIP_COMPANY_CODE || 'entrip').trim();
    const email = (env.ENTRIP_ADMIN_EMAIL || '').trim();
    const password = env.ENTRIP_ADMIN_PASSWORD || '';
    if (!companyCode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || Buffer.byteLength(password) > 72) {
      throw new Error('Invalid initial administrator credentials in the local server configuration.');
    }
    await tx.user.create({ data: {
      companyCode, email, name: 'Entrip 관리자', role: 'ADMIN', password: await apiRequire('bcryptjs').hash(password, 12),
    } });
    console.log('Initial administrator created.');
  });
}

async function main() {
  const db = process.env.ENTRIP_SQLITE_PATH || '/data/entrip.sqlite';
  if (!path.isAbsolute(db) || process.env.DATABASE_URL !== 'file:' + db) throw new Error('SQLite host paths do not match.');
  const backups = process.env.ENTRIP_BACKUP_DIR || '/backups';
  const marker = path.join(path.dirname(db), '.entrip-initialized');
  process.umask(0o077);
  if (process.argv[2] !== '--under-lock') {
    for (const dir of [path.dirname(db), backups]) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      if (process.getuid() === 0) {
        try { fs.chownSync(dir, 1000, 1000); }
        catch (error) {
          // Some Desktop bind mounts inherit the Windows ACL and disallow chown.
          // Verify real access after dropping privileges in either case.
          if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
        }
      }
    }
    if (process.getuid() === 0) {
      process.setgroups([]);
      process.setgid(1000);
      process.setuid(1000);
    }
    for (const dir of [path.dirname(db), backups]) fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
    if (process.argv[2] === '--prepare-directories') return;
    run('python3', [sqlite('backup.py'), 'guard', '--', process.execPath, __filename, '--under-lock']);
    return;
  }

  const exists = fs.existsSync(db);
  if (!exists && (fs.existsSync(marker) || fs.readdirSync(backups).some(name => name.endsWith('.sqlite3')))) {
    throw new Error('The active database is missing. Restore a verified snapshot before starting.');
  }
  if (exists && fs.statSync(db).size === 0) throw new Error('The active database is empty. Restore a verified snapshot before starting.');
  if (process.env.ENTRIP_IMPORT_POSTGRES === 'true') {
    run('python3', [sqlite('import_pg.py'), '--database', db, ...(exists ? ['--check-existing'] : [])]);
  }

  const schema = path.join(root, 'packages/api/prisma/sqlite/schema.prisma');
  run(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema]);
  run('python3', [sqlite('history.py'), db]);
  const { PrismaClient } = apiRequire('@prisma/client');
  const prisma = new PrismaClient();
  try {
    // WAL allows a consistent online backup while employees save bookings.
    const [mode] = await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
    if (String(mode?.journal_mode).toLowerCase() !== 'wal') throw new Error('Unable to enable the SQLite WAL on this local disk.');
    await createFirstAdmin(prisma, process.env);
  } finally {
    await prisma.$disconnect();
  }
  fs.writeFileSync(marker, 'Entrip SQLite\n');
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createFirstAdmin };
