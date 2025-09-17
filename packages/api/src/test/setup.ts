import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Set test database URL
const TEST_DATABASE_URL = 'postgresql://test_user:test_pass@localhost:5433/entrip_test?schema=public';
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Global test prisma client
let prisma: PrismaClient;

// Setup before all tests
beforeAll(async () => {
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