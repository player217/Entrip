import { PrismaClient } from '@prisma/client';
import prisma from './prisma';

/**
 * Database transaction utilities with optimistic locking support
 */

export type IsolationLevel = 
  | 'ReadCommitted'
  | 'RepeatableRead'
  | 'Serializable';

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  maxWait?: number;
  timeout?: number;
}

/**
 * Execute a transaction with proper isolation level and error handling
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const {
    isolationLevel = 'ReadCommitted',
    maxWait = 5000,
    timeout = 30000
  } = options;

  try {
    return await prisma.$transaction(fn, {
      isolationLevel,
      maxWait,
      timeout
    });
  } catch (error: any) {
    // Handle specific database errors
    if (error.code === 'P2034') {
      throw new Error('TRANSACTION_CONFLICT: The transaction failed due to a write conflict');
    }
    if (error.code === 'P2024') {
      throw new Error('TRANSACTION_TIMEOUT: The transaction timed out');
    }
    throw error;
  }
}

/**
 * Optimistic locking helper for update operations
 */
export async function withOptimisticLock<T>(
  model: any,
  id: string,
  currentVersion: number,
  updateFn: (data: any) => any
): Promise<T | null> {
  const updated = await model.updateMany({
    where: { 
      id,
      version: currentVersion 
    },
    data: {
      ...updateFn({}),
      version: { increment: 1 }
    }
  });

  if (updated.count === 0) {
    throw new OptimisticLockError('Version conflict detected');
  }

  // Fetch the updated record
  return await model.findUnique({ where: { id } });
}

/**
 * Custom error class for optimistic lock conflicts
 */
export class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

/**
 * Retry logic for handling optimistic lock conflicts
 */
export async function retryOnConflict<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on optimistic lock conflicts
      if (error instanceof OptimisticLockError) {
        if (i < maxRetries - 1) {
          // Exponential backoff with jitter
          const delay = delayMs * Math.pow(2, i) + Math.random() * 100;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Batch processing utility with transaction support
 */
export async function processBatch<T, R>(
  items: T[],
  processFn: (item: T, tx: any) => Promise<R>,
  batchSize: number = 100,
  options: TransactionOptions = {}
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await withTransaction(async (tx) => {
      return await Promise.all(
        batch.map(item => processFn(item, tx))
      );
    }, options);
    
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Deadlock retry wrapper
 */
export async function withDeadlockRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Postgres deadlock error code
      if (error.code === 'P2001' || error.code === '40P01') {
        if (i < maxRetries - 1) {
          // Random delay to avoid retry storms
          const delay = Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  connectionCount?: number;
  latencyMs?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    
    // Simple query to check connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get connection stats (this is PostgreSQL specific)
    const stats = await prisma.$queryRaw`
      SELECT 
        count(*) as connection_count,
        max(state_change) as last_activity
      FROM pg_stat_activity 
      WHERE datname = current_database()
    ` as any[];
    
    const latencyMs = Date.now() - startTime;
    
    return {
      isHealthy: true,
      connectionCount: Number(stats[0]?.connection_count || 0),
      latencyMs
    };
  } catch (error: any) {
    return {
      isHealthy: false,
      error: error.message
    };
  }
}

/**
 * Clean up old data based on retention policies
 */
export async function cleanupOldData(
  retentionDays: Record<string, number> = {
    auditLog: 90,
    externalCallLog: 30,
    idempotencyKey: 7,
    messageRead: 30,
    flightStatusCache: 1,
    fxRateCache: 7
  }
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  await withTransaction(async (tx) => {
    // Cleanup AuditLog
    if (retentionDays.auditLog) {
      const auditResult = await tx.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - retentionDays.auditLog * 24 * 60 * 60 * 1000)
          }
        }
      });
      results.auditLog = auditResult.count;
    }
    
    // Cleanup ExternalCallLog
    if (retentionDays.externalCallLog) {
      const callResult = await tx.externalCallLog.deleteMany({
        where: {
          occurredAt: {
            lt: new Date(Date.now() - retentionDays.externalCallLog * 24 * 60 * 60 * 1000)
          }
        }
      });
      results.externalCallLog = callResult.count;
    }
    
    // Cleanup IdempotencyKey
    if (retentionDays.idempotencyKey) {
      const idempotencyResult = await tx.idempotencyKey.deleteMany({
        where: {
          ttl: { lt: new Date() }
        }
      });
      results.idempotencyKey = idempotencyResult.count;
    }
    
    // Cleanup old cache entries
    if (retentionDays.flightStatusCache) {
      const flightCacheResult = await tx.flightStatusCache.deleteMany({
        where: {
          fetchedAt: {
            lt: new Date(Date.now() - retentionDays.flightStatusCache * 24 * 60 * 60 * 1000)
          }
        }
      });
      results.flightStatusCache = flightCacheResult.count;
    }
    
    if (retentionDays.fxRateCache) {
      const fxCacheResult = await tx.fxRateCache.deleteMany({
        where: {
          fetchedAt: {
            lt: new Date(Date.now() - retentionDays.fxRateCache * 24 * 60 * 60 * 1000)
          }
        }
      });
      results.fxRateCache = fxCacheResult.count;
    }
  });
  
  return results;
}

/**
 * Validate data integrity constraints
 */
export async function validateDataIntegrity(): Promise<{
  isValid: boolean;
  issues: Array<{ table: string; issue: string; count: number }>;
}> {
  const issues: Array<{ table: string; issue: string; count: number }> = [];
  
  // Check for orphaned records
  const orphanedBookingEvents = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "BookingEvent" be 
    LEFT JOIN "Booking" b ON be."bookingId" = b.id 
    WHERE b.id IS NULL
  ` as any[];
  
  if (Number(orphanedBookingEvents[0]?.count) > 0) {
    issues.push({
      table: 'BookingEvent',
      issue: 'Orphaned records without parent booking',
      count: Number(orphanedBookingEvents[0].count)
    });
  }
  
  // Check for negative amounts
  const negativeAmounts = await prisma.$queryRaw`
    SELECT 
      'Booking' as table_name, COUNT(*) as count 
    FROM "Booking" 
    WHERE "totalPrice" < 0
    UNION ALL
    SELECT 
      'Transaction' as table_name, COUNT(*) as count 
    FROM "Transaction" 
    WHERE "amount" < 0
    UNION ALL
    SELECT 
      'Settlement' as table_name, COUNT(*) as count 
    FROM "Settlement" 
    WHERE "amount" < 0
  ` as any[];
  
  negativeAmounts.forEach(row => {
    if (Number(row.count) > 0) {
      issues.push({
        table: row.table_name,
        issue: 'Negative amounts detected',
        count: Number(row.count)
      });
    }
  });
  
  // Check for invalid date ranges
  const invalidDates = await prisma.$queryRaw`
    SELECT COUNT(*) as count 
    FROM "Booking" 
    WHERE "startDate" >= "endDate"
  ` as any[];
  
  if (Number(invalidDates[0]?.count) > 0) {
    issues.push({
      table: 'Booking',
      issue: 'Invalid date ranges (start >= end)',
      count: Number(invalidDates[0].count)
    });
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}