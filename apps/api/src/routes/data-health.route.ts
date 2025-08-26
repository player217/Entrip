import { Router, Request, Response } from 'express';
import {
  checkDatabaseHealth,
  validateDataIntegrity,
  cleanupOldData
} from '../lib/database-utils';
import {
  archiveOldBookings,
  archiveOldMessages,
  archiveAuditLogs,
  cleanupExpiredCache,
  getArchiveStatistics
} from '../lib/data-archiving';
import prisma from '../lib/prisma';

const router = Router();

/**
 * Enhanced database health check with detailed metrics
 */
router.get('/health/database', async (req: Request, res: Response) => {
  try {
    const health = await checkDatabaseHealth();
    
    // Additional metrics
    const metrics = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM "Booking") as booking_count,
        (SELECT COUNT(*) FROM "Transaction") as transaction_count,
        (SELECT COUNT(*) FROM "User") as user_count,
        (SELECT pg_database_size(current_database())) as db_size_bytes,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT MAX(query_start) FROM pg_stat_activity WHERE state = 'active') as last_query_time
    ` as any[];
    
    const dbMetrics = metrics[0] || {};
    
    res.json({
      status: health.isHealthy ? 'healthy' : 'unhealthy',
      database: {
        ...health,
        metrics: {
          bookings: Number(dbMetrics.booking_count || 0),
          transactions: Number(dbMetrics.transaction_count || 0),
          users: Number(dbMetrics.user_count || 0),
          sizeBytes: Number(dbMetrics.db_size_bytes || 0),
          sizeMB: Math.round(Number(dbMetrics.db_size_bytes || 0) / 1024 / 1024),
          connections: {
            active: Number(dbMetrics.active_connections || 0),
            idle: Number(dbMetrics.idle_connections || 0),
            total: health.connectionCount || 0
          },
          lastActivity: dbMetrics.last_query_time
        }
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Data integrity validation endpoint
 */
router.get('/health/integrity', async (req: Request, res: Response) => {
  try {
    const integrity = await validateDataIntegrity();
    
    // Additional integrity checks
    const additionalChecks = await prisma.$queryRaw`
      WITH integrity_checks AS (
        SELECT 
          'Booking without user' as check_name,
          COUNT(*) as issue_count
        FROM "Booking" b
        LEFT JOIN "User" u ON b."createdBy" = u.id
        WHERE u.id IS NULL
        
        UNION ALL
        
        SELECT 
          'Transaction without account' as check_name,
          COUNT(*) as issue_count
        FROM "Transaction" t
        LEFT JOIN "Account" a ON t."accountId" = a.id
        WHERE a.id IS NULL
        
        UNION ALL
        
        SELECT 
          'Approval without requester' as check_name,
          COUNT(*) as issue_count
        FROM "Approval" ap
        LEFT JOIN "User" u ON ap."requesterId" = u.id
        WHERE u.id IS NULL
        
        UNION ALL
        
        SELECT 
          'Duplicate booking numbers' as check_name,
          COUNT(*) - COUNT(DISTINCT "bookingNumber") as issue_count
        FROM "Booking"
        
        UNION ALL
        
        SELECT 
          'Invalid currency codes' as check_name,
          COUNT(*) as issue_count
        FROM "Booking"
        WHERE "currency" NOT IN ('KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP')
      )
      SELECT * FROM integrity_checks WHERE issue_count > 0
    ` as any[];
    
    const allIssues = [
      ...integrity.issues,
      ...additionalChecks.map(check => ({
        table: 'Multiple',
        issue: check.check_name,
        count: Number(check.issue_count)
      }))
    ];
    
    res.json({
      status: allIssues.length === 0 ? 'valid' : 'invalid',
      isValid: allIssues.length === 0,
      issues: allIssues,
      summary: {
        totalIssues: allIssues.length,
        affectedRecords: allIssues.reduce((sum, issue) => sum + issue.count, 0)
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Query performance monitoring
 */
router.get('/health/performance', async (req: Request, res: Response) => {
  try {
    // Get slow queries
    const slowQueries = await prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_exec_time as total_time_ms,
        mean_exec_time as mean_time_ms,
        max_exec_time as max_time_ms,
        min_exec_time as min_time_ms,
        stddev_exec_time as stddev_time_ms
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 10
    ` as any[];
    
    // Get table statistics
    const tableStats = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 20
    ` as any[];
    
    // Get index usage
    const indexUsage = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20
    ` as any[];
    
    res.json({
      status: 'healthy',
      performance: {
        slowQueries: slowQueries.map(q => ({
          query: q.query?.substring(0, 100) + '...',
          calls: Number(q.calls),
          meanTimeMs: Number(q.mean_time_ms),
          maxTimeMs: Number(q.max_time_ms),
          totalTimeMs: Number(q.total_time_ms)
        })),
        tableStats: tableStats.map(t => ({
          table: t.tablename,
          liveRows: Number(t.live_rows),
          deadRows: Number(t.dead_rows),
          inserts: Number(t.inserts),
          updates: Number(t.updates),
          deletes: Number(t.deletes),
          lastVacuum: t.last_vacuum,
          lastAnalyze: t.last_analyze
        })),
        indexUsage: indexUsage.map(i => ({
          table: i.tablename,
          index: i.indexname,
          scans: Number(i.index_scans),
          size: i.index_size
        }))
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    // pg_stat_statements might not be enabled
    res.json({
      status: 'partial',
      message: 'Some performance metrics unavailable',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Connection pool statistics
 */
router.get('/health/connections', async (req: Request, res: Response) => {
  try {
    const connections = await prisma.$queryRaw`
      SELECT 
        pid,
        usename as username,
        application_name,
        client_addr,
        state,
        state_change,
        query_start,
        wait_event_type,
        wait_event,
        backend_type
      FROM pg_stat_activity
      WHERE datname = current_database()
      ORDER BY state_change DESC
    ` as any[];
    
    const summary = {
      total: connections.length,
      byState: {} as Record<string, number>,
      byApplication: {} as Record<string, number>,
      byUser: {} as Record<string, number>
    };
    
    connections.forEach(conn => {
      // Count by state
      summary.byState[conn.state || 'unknown'] = 
        (summary.byState[conn.state || 'unknown'] || 0) + 1;
      
      // Count by application
      summary.byApplication[conn.application_name || 'unknown'] = 
        (summary.byApplication[conn.application_name || 'unknown'] || 0) + 1;
      
      // Count by user
      summary.byUser[conn.username || 'unknown'] = 
        (summary.byUser[conn.username || 'unknown'] || 0) + 1;
    });
    
    res.json({
      status: 'healthy',
      connections: {
        summary,
        details: connections.map(c => ({
          pid: c.pid,
          username: c.username,
          application: c.application_name,
          clientAddr: c.client_addr,
          state: c.state,
          stateChange: c.state_change,
          queryStart: c.query_start,
          waitEvent: c.wait_event
        }))
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Archive statistics
 */
router.get('/archives/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getArchiveStatistics();
    
    res.json({
      status: 'success',
      archives: stats,
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Manual data cleanup endpoint (protected - should require admin auth)
 */
router.post('/maintenance/cleanup', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check here
    
    const results = await cleanupOldData({
      auditLog: 90,
      externalCallLog: 30,
      idempotencyKey: 7,
      messageRead: 30,
      flightStatusCache: 1,
      fxRateCache: 7
    });
    
    const cacheResults = await cleanupExpiredCache();
    
    res.json({
      status: 'success',
      cleanup: {
        ...results,
        ...cacheResults
      },
      totalDeleted: Object.values(results).reduce((sum, count) => sum + count, 0) +
                   Object.values(cacheResults).reduce((sum, count) => sum + count, 0),
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Manual archive endpoint (protected - should require admin auth)
 */
router.post('/maintenance/archive', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check here
    
    const { target = 'all', retentionMonths } = req.body;
    const results = [];
    
    if (target === 'all' || target === 'bookings') {
      const bookingResult = await archiveOldBookings({
        retentionMonths: retentionMonths || 18,
        batchSize: 1000
      });
      results.push(bookingResult);
    }
    
    if (target === 'all' || target === 'messages') {
      const messageResult = await archiveOldMessages(retentionMonths || 12);
      results.push(messageResult);
    }
    
    if (target === 'all' || target === 'audit') {
      const auditResult = await archiveAuditLogs(retentionMonths || 6);
      results.push(auditResult);
    }
    
    res.json({
      status: 'success',
      archives: results,
      summary: {
        totalArchived: results.reduce((sum, r) => sum + r.archivedCount, 0),
        totalDeleted: results.reduce((sum, r) => sum + r.deletedCount, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Lock monitoring endpoint
 */
router.get('/health/locks', async (req: Request, res: Response) => {
  try {
    const locks = await prisma.$queryRaw`
      SELECT 
        l.pid,
        a.usename,
        a.application_name,
        l.locktype,
        l.mode,
        l.granted,
        a.query,
        a.query_start,
        age(now(), a.query_start) as query_duration,
        l.relation::regclass as locked_table
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE NOT l.granted OR a.state = 'active'
      ORDER BY a.query_start
    ` as any[];
    
    const blocking = await prisma.$queryRaw`
      SELECT 
        blocking.pid as blocking_pid,
        blocking.usename as blocking_user,
        blocking.query as blocking_query,
        blocked.pid as blocked_pid,
        blocked.usename as blocked_user,
        blocked.query as blocked_query
      FROM pg_locks blocked_locks
      JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
      JOIN pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted
    ` as any[];
    
    res.json({
      status: blocking.length > 0 ? 'warning' : 'healthy',
      locks: {
        total: locks.length,
        blocking: blocking.length,
        details: locks.slice(0, 20), // Limit to 20 for readability
        blockingDetails: blocking
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date()
    });
  }
});

export default router;