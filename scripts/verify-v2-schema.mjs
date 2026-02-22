#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const withDb = args.has('--with-db');

const schemaPath = 'packages/api/prisma/schema.prisma';
const fallbackDbUrl = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';
const prismaCliPath = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

const baseEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || fallbackDbUrl,
};

function failWithGuidance(name, result, hint) {
  const status = typeof result.status === 'number' ? result.status : 1;
  console.error(`\n[verify-v2-schema] FAILED: ${name}`);
  console.error(`[verify-v2-schema] reason: process exited with status ${status}`);
  console.error(`[verify-v2-schema] hint: ${hint}`);
  process.exit(status);
}

function runStep(name, command, stepArgs, env = baseEnv, hint = 'check logs above') {
  console.log(`\n[verify-v2-schema] ${name}`);
  const result = spawnSync(command, stepArgs, {
    stdio: 'inherit',
    shell: false,
    env,
  });

  if (result.status !== 0) {
    failWithGuidance(name, result, hint);
  }
}

function runPrismaStep(name, prismaArgs, env = baseEnv, hint) {
  runStep(name, process.execPath, [prismaCliPath, ...prismaArgs], env, hint);
}

console.log('[verify-v2-schema] starting');
console.log(`[verify-v2-schema] mode: ${withDb ? 'with-db' : 'schema-only'}`);

runPrismaStep(
  'prisma validate',
  ['validate', '--schema', schemaPath],
  baseEnv,
  'fix schema.prisma syntax/model relation errors, then rerun verify:schema:v2',
);
runPrismaStep(
  'prisma generate',
  ['generate', '--schema', schemaPath],
  baseEnv,
  'check Prisma generator/client config and ensure prisma dependencies are installed',
);

if (withDb) {
  if (!process.env.DATABASE_URL) {
    console.error('\n[verify-v2-schema] FAILED: database gate precheck');
    console.error('[verify-v2-schema] reason: DATABASE_URL is required in --with-db mode');
    console.error('[verify-v2-schema] hint: set DATABASE_URL for target DB, then rerun verify:schema:v2:db');
    process.exit(1);
  }

  runPrismaStep(
    'prisma migrate status',
    ['migrate', 'status', '--schema', schemaPath],
    process.env,
    'resolve migration drift/missing migration files for packages/api/prisma before cutover',
  );
}

console.log('\n[verify-v2-schema] passed');
