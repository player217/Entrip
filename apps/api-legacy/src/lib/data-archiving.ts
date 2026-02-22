import { PrismaClient } from '@prisma/client';
import prisma from './prisma';
import { withTransaction } from './database-utils';

/**
 * Data archiving and lifecycle management utilities
 */

export interface ArchiveConfig {
  retentionMonths: number;
  batchSize: number;
  archiveTableSuffix?: string;
}

export interface ArchiveResult {
  tableName: string;
  archivedCount: number;
  deletedCount: number;
  duration: number;
  error?: string;
}

/**
 * Archive old booking data
 */
export async function archiveOldBookings(
  config: ArchiveConfig = {
    retentionMonths: 18,
    batchSize: 1000,
    archiveTableSuffix: '_archive'
  }
): Promise<ArchiveResult> {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - config.retentionMonths);

  let archivedCount = 0;
  let deletedCount = 0;

  try {
    // First, ensure archive table exists
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Booking_archive" (
        LIKE "Booking" INCLUDING ALL
      );
    `;

    // Add archive metadata columns if they don't exist
    await prisma.$executeRaw`
      ALTER TABLE "Booking_archive" 
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS archive_reason VARCHAR(50) DEFAULT 'age_based';
    `;

    // Archive in batches to avoid locking issues
    let hasMore = true;
    while (hasMore) {
      const result = await withTransaction(async (tx) => {
        // Find old bookings to archive
        const oldBookings = await tx.booking.findMany({
          where: {
            endDate: { lt: cutoffDate },
            status: { in: ['CONFIRMED', 'CANCELLED'] }
          },
          take: config.batchSize,
          include: {
            flights: true,
            hotels: true,
            vehicles: true,
            settlements: true,
            history: true,
            events: true,
            documents: true
          }
        });

        if (oldBookings.length === 0) {
          return { moved: 0, deleted: 0 };
        }

        // Insert into archive table using raw SQL for better performance
        for (const booking of oldBookings) {
          // Archive main booking record
          await tx.$executeRaw`
            INSERT INTO "Booking_archive"
            SELECT *, NOW() as archived_at, 'age_based' as archive_reason
            FROM "Booking"
            WHERE id = ${booking.id}
            ON CONFLICT (id) DO NOTHING;
          `;

          // Archive related records
          if (booking.flights.length > 0) {
            await tx.$executeRaw`
              CREATE TABLE IF NOT EXISTS "Flight_archive" (
                LIKE "Flight" INCLUDING ALL
              );
              
              INSERT INTO "Flight_archive"
              SELECT * FROM "Flight"
              WHERE "bookingId" = ${booking.id}
              ON CONFLICT DO NOTHING;
            `;
          }

          if (booking.hotels.length > 0) {
            await tx.$executeRaw`
              CREATE TABLE IF NOT EXISTS "Hotel_archive" (
                LIKE "Hotel" INCLUDING ALL
              );
              
              INSERT INTO "Hotel_archive"
              SELECT * FROM "Hotel"
              WHERE "bookingId" = ${booking.id}
              ON CONFLICT DO NOTHING;
            `;
          }

          if (booking.settlements.length > 0) {
            await tx.$executeRaw`
              CREATE TABLE IF NOT EXISTS "Settlement_archive" (
                LIKE "Settlement" INCLUDING ALL
              );
              
              INSERT INTO "Settlement_archive"
              SELECT * FROM "Settlement"
              WHERE "bookingId" = ${booking.id}
              ON CONFLICT DO NOTHING;
            `;
          }
        }

        // Delete from main tables after successful archive
        const bookingIds = oldBookings.map(b => b.id);
        
        // Delete related records first (cascading delete handles most)
        await tx.flight.deleteMany({
          where: { bookingId: { in: bookingIds } }
        });
        
        await tx.hotel.deleteMany({
          where: { bookingId: { in: bookingIds } }
        });
        
        await tx.vehicle.deleteMany({
          where: { bookingId: { in: bookingIds } }
        });
        
        await tx.settlement.deleteMany({
          where: { bookingId: { in: bookingIds } }
        });
        
        // Delete main booking records
        const deleteResult = await tx.booking.deleteMany({
          where: { id: { in: bookingIds } }
        });

        return {
          moved: oldBookings.length,
          deleted: deleteResult.count
        };
      });

      archivedCount += result.moved;
      deletedCount += result.deleted;
      hasMore = result.moved === config.batchSize;
    }

    return {
      tableName: 'Booking',
      archivedCount,
      deletedCount,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      tableName: 'Booking',
      archivedCount,
      deletedCount,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Archive old messages and conversations
 */
export async function archiveOldMessages(
  retentionMonths: number = 12
): Promise<ArchiveResult> {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

  try {
    // Create archive table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Message_archive" (
        LIKE "Message" INCLUDING ALL
      );
      
      ALTER TABLE "Message_archive" 
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NOW();
    `;

    // Archive old messages
    const archiveResult = await prisma.$executeRaw`
      WITH archived AS (
        INSERT INTO "Message_archive"
        SELECT m.*, NOW() as archived_at
        FROM "Message" m
        WHERE m."createdAt" < ${cutoffDate}
        AND m."isDeleted" = true
        ON CONFLICT DO NOTHING
        RETURNING id
      )
      SELECT COUNT(*) FROM archived;
    `;

    // Delete archived messages
    const deleteResult = await prisma.message.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isDeleted: true
      }
    });

    return {
      tableName: 'Message',
      archivedCount: deleteResult.count,
      deletedCount: deleteResult.count,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      tableName: 'Message',
      archivedCount: 0,
      deletedCount: 0,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Archive old audit logs
 */
export async function archiveAuditLogs(
  retentionMonths: number = 6
): Promise<ArchiveResult> {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

  try {
    // Create partitioned archive table by year-month
    const yearMonth = cutoffDate.toISOString().substring(0, 7).replace('-', '_');
    const archiveTableName = `AuditLog_archive_${yearMonth}`;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "${archiveTableName}" (
        LIKE "AuditLog" INCLUDING ALL
      );
    `;

    // Move old audit logs to archive
    const moveResult = await prisma.$executeRaw`
      WITH moved AS (
        INSERT INTO "${archiveTableName}"
        SELECT * FROM "AuditLog"
        WHERE "createdAt" < ${cutoffDate}
        RETURNING id
      ),
      deleted AS (
        DELETE FROM "AuditLog"
        WHERE id IN (SELECT id FROM moved)
        RETURNING id
      )
      SELECT 
        (SELECT COUNT(*) FROM moved) as archived,
        (SELECT COUNT(*) FROM deleted) as deleted;
    `;

    return {
      tableName: 'AuditLog',
      archivedCount: 0, // Will be populated from moveResult
      deletedCount: 0,
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      tableName: 'AuditLog',
      archivedCount: 0,
      deletedCount: 0,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // Cleanup expired FX rate cache
  const fxResult = await prisma.$executeRaw`
    DELETE FROM "FxRateCache"
    WHERE "fetchedAt" < NOW() - INTERVAL '1 second' * "ttlSec";
  `;
  results.fxRateCache = Number(fxResult);

  // Cleanup expired flight status cache
  const flightResult = await prisma.$executeRaw`
    DELETE FROM "FlightStatusCache"
    WHERE "fetchedAt" < NOW() - INTERVAL '1 second' * "ttlSec";
  `;
  results.flightStatusCache = Number(flightResult);

  // Cleanup expired idempotency keys
  const idempotencyResult = await prisma.idempotencyKey.deleteMany({
    where: {
      ttl: { lt: new Date() }
    }
  });
  results.idempotencyKey = idempotencyResult.count;

  // Cleanup delivered outbox messages
  const outboxResult = await prisma.outbox.deleteMany({
    where: {
      deliveredAt: {
        not: null,
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Keep for 24 hours after delivery
      }
    }
  });
  results.outbox = outboxResult.count;

  return results;
}

/**
 * Create monthly partition for a table
 */
export async function createMonthlyPartition(
  tableName: string,
  year: number,
  month: number
): Promise<boolean> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const partitionName = `${tableName}_${year}_${String(month).padStart(2, '0')}`;

    // Create partition table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "${partitionName}" 
      PARTITION OF "${tableName}"
      FOR VALUES FROM (${startDate.toISOString()}) 
      TO (${endDate.toISOString()});
    `;

    // Create indexes on partition
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "idx_${partitionName}_created"
      ON "${partitionName}"("createdAt");
    `;

    return true;
  } catch (error: any) {
    console.error(`Failed to create partition: ${error.message}`);
    return false;
  }
}

/**
 * Archive summary statistics
 */
export async function getArchiveStatistics(): Promise<{
  tables: Array<{
    name: string;
    mainCount: number;
    archiveCount: number;
    oldestRecord?: Date;
    newestRecord?: Date;
  }>;
  totalMainRecords: number;
  totalArchivedRecords: number;
}> {
  const tables: Array<{
    name: string;
    mainCount: number;
    archiveCount: number;
    oldestRecord?: Date;
    newestRecord?: Date;
  }> = [];

  // Check Booking tables
  const bookingStats = await prisma.$queryRaw`
    SELECT 
      'Booking' as table_name,
      (SELECT COUNT(*) FROM "Booking") as main_count,
      (SELECT COUNT(*) FROM "Booking_archive" WHERE EXISTS (SELECT 1 FROM "Booking_archive" LIMIT 1)) as archive_count,
      (SELECT MIN("createdAt") FROM "Booking") as oldest_main,
      (SELECT MAX("createdAt") FROM "Booking") as newest_main
  ` as any[];

  if (bookingStats[0]) {
    tables.push({
      name: 'Booking',
      mainCount: Number(bookingStats[0].main_count),
      archiveCount: Number(bookingStats[0].archive_count || 0),
      oldestRecord: bookingStats[0].oldest_main,
      newestRecord: bookingStats[0].newest_main
    });
  }

  // Check Message tables
  const messageStats = await prisma.$queryRaw`
    SELECT 
      'Message' as table_name,
      (SELECT COUNT(*) FROM "Message") as main_count,
      (SELECT COUNT(*) FROM "Message_archive" WHERE EXISTS (SELECT 1 FROM "Message_archive" LIMIT 1)) as archive_count,
      (SELECT MIN("createdAt") FROM "Message") as oldest_main,
      (SELECT MAX("createdAt") FROM "Message") as newest_main
  ` as any[];

  if (messageStats[0]) {
    tables.push({
      name: 'Message',
      mainCount: Number(messageStats[0].main_count),
      archiveCount: Number(messageStats[0].archive_count || 0),
      oldestRecord: messageStats[0].oldest_main,
      newestRecord: messageStats[0].newest_main
    });
  }

  // Check AuditLog
  const auditStats = await prisma.auditLog.aggregate({
    _count: { id: true },
    _min: { createdAt: true },
    _max: { createdAt: true }
  });

  tables.push({
    name: 'AuditLog',
    mainCount: auditStats._count.id,
    archiveCount: 0, // Would need to check multiple archive tables
    oldestRecord: auditStats._min.createdAt || undefined,
    newestRecord: auditStats._max.createdAt || undefined
  });

  const totalMainRecords = tables.reduce((sum, t) => sum + t.mainCount, 0);
  const totalArchivedRecords = tables.reduce((sum, t) => sum + t.archiveCount, 0);

  return {
    tables,
    totalMainRecords,
    totalArchivedRecords
  };
}