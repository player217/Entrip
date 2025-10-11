import { PrismaClient } from '@prisma/client';
import path from 'path';
import { execSync } from 'child_process';
import { rateLimiter } from '../middlewares/rateLimit.middleware';

jest.setTimeout(30000);

// Load test environment variables if present
// Using require to avoid TypeScript type resolution issues in container
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
// Ensure per-run rate limit isolation to avoid cross-suite interference
if (!process.env.RATE_LIMIT_PREFIX) {
  process.env.RATE_LIMIT_PREFIX = `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Resolve test DB URL with sensible defaults
// Prefer docker network host first to support running tests in host while DB runs in docker
const DEFAULTS = [
  'postgresql://entrip:entrip@postgres:5432/entrip_test',
  'postgresql://entrip:entrip@localhost:5432/entrip_test',
];
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || DEFAULTS[0];
// Debug: print resolved DB URL for CI/container clarity
// eslint-disable-next-line no-console
console.log('[test-setup] NODE_ENV=%s DB_URL=%s', process.env.NODE_ENV, TEST_DATABASE_URL);
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Global test prisma client
let prisma: PrismaClient;

// Setup before all tests
beforeAll(async () => {
  // Try to create and migrate test DB ahead of prisma usage
  try {
    // Always attempt to prepare a dedicated test DB if the helper script exists
    const hasPrepare = (() => {
      try {
        execSync('test -f scripts/test-db.prepare.sh', { cwd: path.resolve(__dirname, '../../../../') });
        return true;
      } catch {
        return false;
      }
    })();
    if (hasPrepare) {
      execSync(`DATABASE_URL=${TEST_DATABASE_URL} bash scripts/test-db.prepare.sh`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../../../'),
      });
    }
  } catch (e) {
    // Non-fatal: continue, prisma connect may still succeed
    // eslint-disable-next-line no-console
    console.warn('[test-setup] test-db.prepare failed (continuing):', e);
  }
  // Clear any existing global Prisma instance
  if (globalThis.prisma) {
    await globalThis.prisma.$disconnect();
    globalThis.prisma = undefined;
  }

  // Create Prisma client with test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_DATABASE_URL,
      },
    },
  });

  // Set global instance for lib/prisma.ts to use
  globalThis.prisma = prisma;

  // Connect to database
  await prisma.$connect();

  // Clean database before tests
  await cleanDatabase();
});

// Cleanup after each test
afterEach(async () => {
  // Clean all tables after each test for isolation
  await cleanDatabase();
  // Also clear in-memory rate limit store between tests to avoid interference
  try {
    rateLimiter.clear();
  } catch {}
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Clean all data from database tables
 */
async function cleanDatabase() {
  try {
    // Avoid destructive clean on shared dev DB
    const url = TEST_DATABASE_URL.toLowerCase();
    if (url.includes('/entrip') && !url.includes('entrip_test')) {
      return; // skip cleaning on shared DB
    }
    // Delete in reverse order of dependencies
    // Messaging system tables
    await prisma.messageReaction.deleteMany();
    await prisma.messageRead.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.userPresence.deleteMany();

    // Business logic tables
    await prisma.bookingHistory.deleteMany();
    await prisma.approvalStep.deleteMany();
    await prisma.approval.deleteMany();
    await prisma.account.deleteMany();
    await prisma.financeRecord.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Error cleaning database:', error);
    // If tables don't exist yet, that's okay
  }
}

// Export for use in tests
export { prisma };
