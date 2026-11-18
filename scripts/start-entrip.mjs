import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in the root .env file to an existing PostgreSQL database.');
if (process.env.NODE_ENV === 'production') throw new Error('Use the documented production launcher in production.');
const env = { ...process.env, NODE_ENV: 'development', API_V2_URL: process.env.API_V2_URL || 'http://localhost:4002', INTERNAL_API_V2_URL: process.env.INTERNAL_API_V2_URL || 'http://localhost:4002', JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || randomBytes(48).toString('hex') };
const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
for (const args of [['install', '--frozen-lockfile'], ['run', 'prisma:generate:v2'], ['exec', 'prisma', 'migrate', 'deploy', '--schema', 'packages/api/prisma/schema.prisma'], ['--filter', '@entrip/api', 'db:seed'], ['run', 'build:tokens']]) {
  const result = spawnSync(corepack, ['pnpm', ...args], { env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const child = spawn(corepack, ['pnpm', 'dev:all'], { env, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code || 0));
