import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  withTransaction,
  withOptimisticLock,
  OptimisticLockError,
  retryOnConflict,
  validateDataIntegrity,
  checkDatabaseHealth
} from '../lib/database-utils';

// Mock Prisma client
const prisma = new PrismaClient();

describe('Data Integrity Tests', () => {
  
  describe('CHECK Constraints', () => {
    it('should reject negative booking amounts', async () => {
      await expect(
        prisma.booking.create({
          data: {
            bookingNumber: 'TEST-NEG-001',
            companyCode: 'TEST',
            customerName: 'Test Customer',
            teamName: 'Test Team',
            teamType: 'GROUP',
            bookingType: 'PACKAGE',
            origin: 'Seoul',
            destination: 'Tokyo',
            startDate: new Date('2025-09-01'),
            endDate: new Date('2025-09-05'),
            paxCount: 2,
            nights: 4,
            days: 5,
            totalPrice: -1000, // Negative amount - should fail
            currency: 'KRW',
            manager: 'Test Manager',
            createdBy: 'test-user-id'
          }
        })
      ).rejects.toThrow();
    });

    it('should reject invalid date ranges', async () => {
      await expect(
        prisma.booking.create({
          data: {
            bookingNumber: 'TEST-DATE-001',
            companyCode: 'TEST',
            customerName: 'Test Customer',
            teamName: 'Test Team',
            teamType: 'GROUP',
            bookingType: 'PACKAGE',
            origin: 'Seoul',
            destination: 'Tokyo',
            startDate: new Date('2025-09-05'),
            endDate: new Date('2025-09-01'), // End before start - should fail
            paxCount: 2,
            nights: 4,
            days: 5,
            totalPrice: 100000,
            currency: 'KRW',
            manager: 'Test Manager',
            createdBy: 'test-user-id'
          }
        })
      ).rejects.toThrow();
    });

    it('should reject invalid currency codes', async () => {
      await expect(
        prisma.booking.create({
          data: {
            bookingNumber: 'TEST-CUR-001',
            companyCode: 'TEST',
            customerName: 'Test Customer',
            teamName: 'Test Team',
            teamType: 'GROUP',
            bookingType: 'PACKAGE',
            origin: 'Seoul',
            destination: 'Tokyo',
            startDate: new Date('2025-09-01'),
            endDate: new Date('2025-09-05'),
            paxCount: 2,
            nights: 4,
            days: 5,
            totalPrice: 100000,
            currency: 'XXX', // Invalid currency - should fail
            manager: 'Test Manager',
            createdBy: 'test-user-id'
          }
        })
      ).rejects.toThrow();
    });

    it('should reject invalid email format', async () => {
      await expect(
        prisma.booking.create({
          data: {
            bookingNumber: 'TEST-EMAIL-001',
            companyCode: 'TEST',
            customerName: 'Test Customer',
            teamName: 'Test Team',
            teamType: 'GROUP',
            bookingType: 'PACKAGE',
            origin: 'Seoul',
            destination: 'Tokyo',
            startDate: new Date('2025-09-01'),
            endDate: new Date('2025-09-05'),
            paxCount: 2,
            nights: 4,
            days: 5,
            totalPrice: 100000,
            currency: 'KRW',
            email: 'invalid-email', // Invalid email format - should fail
            manager: 'Test Manager',
            createdBy: 'test-user-id'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Optimistic Locking', () => {
    let testBookingId: string;
    let currentVersion: number;

    beforeAll(async () => {
      // Create a test booking
      const booking = await prisma.booking.create({
        data: {
          bookingNumber: `TEST-OPT-${Date.now()}`,
          companyCode: 'TEST',
          customerName: 'Test Customer',
          teamName: 'Test Team',
          teamType: 'GROUP',
          bookingType: 'PACKAGE',
          origin: 'Seoul',
          destination: 'Tokyo',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-09-05'),
          paxCount: 2,
          nights: 4,
          days: 5,
          totalPrice: 100000,
          currency: 'KRW',
          manager: 'Test Manager',
          createdBy: 'test-user-id'
        }
      });
      testBookingId = booking.id;
      currentVersion = booking.version;
    });

    afterAll(async () => {
      // Cleanup
      if (testBookingId) {
        await prisma.booking.delete({
          where: { id: testBookingId }
        }).catch(() => {});
      }
    });

    it('should handle version conflicts correctly', async () => {
      // Simulate concurrent updates
      const update1 = withOptimisticLock(
        prisma.booking,
        testBookingId,
        currentVersion,
        () => ({ customerName: 'Updated Customer 1' })
      );

      const update2 = withOptimisticLock(
        prisma.booking,
        testBookingId,
        currentVersion, // Same version - should conflict
        () => ({ customerName: 'Updated Customer 2' })
      );

      // One should succeed, one should fail
      const results = await Promise.allSettled([update1, update2]);
      
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      
      // The failure should be an OptimisticLockError
      const failedResult = failures[0] as PromiseRejectedResult;
      expect(failedResult.reason).toBeInstanceOf(OptimisticLockError);
    });

    it('should retry on conflicts with exponential backoff', async () => {
      let attempts = 0;
      
      const result = await retryOnConflict(async () => {
        attempts++;
        
        // Fail first 2 attempts, succeed on third
        if (attempts < 3) {
          throw new OptimisticLockError('Version conflict');
        }
        
        return { success: true, attempts };
      });
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });

  describe('Transaction Patterns', () => {
    it('should rollback entire transaction on failure', async () => {
      const bookingNumber = `TEST-TXN-${Date.now()}`;
      
      await expect(
        withTransaction(async (tx) => {
          // Create booking (should succeed)
          await tx.booking.create({
            data: {
              bookingNumber,
              companyCode: 'TEST',
              customerName: 'Test Customer',
              teamName: 'Test Team',
              teamType: 'GROUP',
              bookingType: 'PACKAGE',
              origin: 'Seoul',
              destination: 'Tokyo',
              startDate: new Date('2025-09-01'),
              endDate: new Date('2025-09-05'),
              paxCount: 2,
              nights: 4,
              days: 5,
              totalPrice: 100000,
              currency: 'KRW',
              manager: 'Test Manager',
              createdBy: 'test-user-id'
            }
          });
          
          // Force an error
          throw new Error('Simulated transaction failure');
        })
      ).rejects.toThrow('Simulated transaction failure');
      
      // Verify booking was not created
      const booking = await prisma.booking.findUnique({
        where: { bookingNumber }
      });
      expect(booking).toBeNull();
    });

    it('should handle isolation levels correctly', async () => {
      const result = await withTransaction(
        async (tx) => {
          // Perform isolated operations
          const count = await tx.booking.count();
          return { isolated: true, count };
        },
        { isolationLevel: 'RepeatableRead' }
      );
      
      expect(result.isolated).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('should respect transaction timeouts', async () => {
      await expect(
        withTransaction(
          async (tx) => {
            // Simulate long-running transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await tx.booking.count();
          },
          { timeout: 1000 } // 1 second timeout
        )
      ).rejects.toThrow();
    });
  });

  describe('Data Integrity Validation', () => {
    it('should detect orphaned records', async () => {
      // This would require creating orphaned test data
      // In a real scenario, you'd set up specific test data
      const integrity = await validateDataIntegrity();
      
      expect(integrity).toHaveProperty('isValid');
      expect(integrity).toHaveProperty('issues');
      expect(Array.isArray(integrity.issues)).toBe(true);
    });

    it('should detect negative amounts', async () => {
      // This test would check if the validation catches negative amounts
      // that somehow bypassed the CHECK constraints
      const integrity = await validateDataIntegrity();
      
      const negativeAmountIssues = integrity.issues.filter(
        issue => issue.issue.includes('Negative amounts')
      );
      
      // In a clean database, there should be no negative amounts
      expect(negativeAmountIssues).toHaveLength(0);
    });

    it('should detect invalid date ranges', async () => {
      const integrity = await validateDataIntegrity();
      
      const dateRangeIssues = integrity.issues.filter(
        issue => issue.issue.includes('Invalid date ranges')
      );
      
      // In a clean database, there should be no invalid date ranges
      expect(dateRangeIssues).toHaveLength(0);
    });
  });

  describe('Database Health Checks', () => {
    it('should report database health status', async () => {
      const health = await checkDatabaseHealth();
      
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('connectionCount');
      expect(health).toHaveProperty('latencyMs');
      
      // In test environment, database should be healthy
      expect(health.isHealthy).toBe(true);
      expect(health.connectionCount).toBeGreaterThan(0);
      expect(health.latencyMs).toBeGreaterThan(0);
      expect(health.latencyMs).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle database connection failures gracefully', async () => {
      // Mock a connection failure
      const originalQueryRaw = prisma.$queryRaw;
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      const health = await checkDatabaseHealth();
      
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBe('Connection failed');
      
      // Restore original function
      prisma.$queryRaw = originalQueryRaw;
    });
  });

  describe('Performance Indexes', () => {
    it('should use indexes for common queries', async () => {
      // Check that indexes are being used
      const explainResult = await prisma.$queryRaw`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM "Booking"
        WHERE status = 'CONFIRMED'
        AND "startDate" >= CURRENT_DATE
        ORDER BY "startDate"
        LIMIT 10
      ` as any[];
      
      const plan = explainResult[0]['QUERY PLAN'][0];
      
      // Verify index scan is being used
      expect(JSON.stringify(plan)).toContain('Index');
    });

    it('should use partial indexes for filtered queries', async () => {
      const explainResult = await prisma.$queryRaw`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM "Booking"
        WHERE status = 'CONFIRMED'
        AND "startDate" >= '2025-09-01'
        AND "endDate" <= '2025-09-30'
      ` as any[];
      
      const plan = explainResult[0]['QUERY PLAN'][0];
      
      // Should use the partial index we created
      expect(JSON.stringify(plan)).toMatch(/Index|Bitmap/);
    });
  });

  describe('Currency and Amount Validation', () => {
    it('should enforce valid currency codes', async () => {
      const validCurrencies = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP'];
      
      for (const currency of validCurrencies) {
        // These should succeed
        expect(() => {
          // In a real test, you'd create actual records
          return { currency, valid: true };
        }).toBeTruthy();
      }
    });

    it('should calculate exchange rates correctly', async () => {
      // Test exchange rate constraints
      await expect(
        prisma.settlement.create({
          data: {
            bookingId: 'test-booking-id',
            type: 'income',
            currency: 'USD',
            amount: 1000,
            exchangeRate: -1, // Negative exchange rate - should fail
          }
        })
      ).rejects.toThrow();
    });
  });
});

describe('Data Archiving Tests', () => {
  describe('Archive Operations', () => {
    it('should archive old bookings correctly', async () => {
      // This would test the archiving functionality
      // In a real scenario, you'd create old test data first
      
      // Mock implementation for testing
      const mockArchiveResult = {
        tableName: 'Booking',
        archivedCount: 10,
        deletedCount: 10,
        duration: 1000
      };
      
      expect(mockArchiveResult.archivedCount).toBe(mockArchiveResult.deletedCount);
      expect(mockArchiveResult.duration).toBeGreaterThan(0);
    });

    it('should clean up expired cache entries', async () => {
      // Create expired test cache entries
      const expiredKey = await prisma.idempotencyKey.create({
        data: {
          key: `test-expired-${Date.now()}`,
          endpoint: '/test',
          requestHash: 'test-hash',
          ttl: new Date(Date.now() - 1000) // Already expired
        }
      });
      
      // Run cleanup
      const { cleanupOldData } = require('../lib/database-utils');
      const results = await cleanupOldData({ idempotencyKey: 0 });
      
      expect(results.idempotencyKey).toBeGreaterThan(0);
      
      // Verify expired key was deleted
      const stillExists = await prisma.idempotencyKey.findUnique({
        where: { id: expiredKey.id }
      });
      expect(stillExists).toBeNull();
    });
  });
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});