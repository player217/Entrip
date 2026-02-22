#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'docker-compose.dev.yml',
    mustContain: [
      'NEXT_PUBLIC_BOOKING_API_MODE: v2',
      'NEXT_PUBLIC_TEAM_BOOKING_API_MODE: v2',
      'BOOKING_API_MODE: v2',
      'TEAM_BOOKING_API_MODE: v2',
      'API_MIGRATION_PHASE: 3',
    ],
    mustNotContain: [
      'USE_V1_BOOKINGS',
      'BOOKING_API_MODE: v1',
      'TEAM_BOOKING_API_MODE: v1',
    ],
  },
  {
    file: 'docker-compose.prod.yml',
    mustContain: [
      'NEXT_PUBLIC_BOOKING_API_MODE: v2',
      'NEXT_PUBLIC_TEAM_BOOKING_API_MODE: v2',
      'BOOKING_API_MODE: v2',
      'TEAM_BOOKING_API_MODE: v2',
      'MIGRATION_PHASE: 3',
      'API_MIGRATION_PHASE: 3',
    ],
    mustNotContain: [
      'USE_V1_BOOKINGS',
      'BOOKING_API_MODE: v1',
      'TEAM_BOOKING_API_MODE: v1',
    ],
  },
  {
    file: 'apps/web/app/api/v2/[...path]/route.ts',
    mustContain: [
      '/api/v2/${path}',
    ],
    mustNotContain: [
      'USE_V1_BOOKINGS',
      '/api/v1/',
    ],
  },
  {
    file: 'apps/web/app/api/bookings/[...path]/route.ts',
    mustContain: [
      '/api/v2/bookings',
      'isLegacyCompatibilityPath',
    ],
    mustNotContain: [
      'Proxy for legacy API v1 bookings endpoints',
    ],
  },
  {
    file: 'apps/web/app/api/auth/verify/route.ts',
    mustContain: [
      '/api/v2/auth/me',
    ],
    mustNotContain: [
      '/api/auth/verify',
    ],
  },
  {
    file: 'apps/web/app/api/auth/logout/route.ts',
    mustContain: [
      '/api/v2/auth/logout',
    ],
    mustNotContain: [
      '/api/auth/logout',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    failures.push(`[missing] ${check.file}`);
    continue;
  }

  const content = fs.readFileSync(abs, 'utf8');
  for (const token of check.mustContain || []) {
    if (!content.includes(token)) {
      failures.push(`[${check.file}] missing token: ${token}`);
    }
  }
  for (const token of check.mustNotContain || []) {
    if (content.includes(token)) {
      failures.push(`[${check.file}] forbidden token present: ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error('V2 cutover verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('V2 cutover verification passed.');
