import { Router, Request, Response, NextFunction } from 'express';
import { SchemaGuardian } from '../services/schema-guardian.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Schema Health Monitoring Endpoints
 * 실시간 스키마 상태 모니터링 및 자동 복구
 */

// 간단한 health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'schema-health',
    timestamp: new Date().toISOString()
  });
});

// 상세 스키마 검사
router.get('/health/schema', async (req: Request, res: Response, next: NextFunction) => {
  const guardian = new SchemaGuardian();
  
  try {
    console.log('[Schema Health] Running health check...');
    const result = await guardian.checkHealth();
    
    const status = result.healthy ? 'healthy' : 'unhealthy';
    const httpStatus = result.healthy ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      issues: result.issues,
      recommendations: result.recommendations,
      timestamp: result.timestamp,
      summary: {
        total_issues: result.issues.length,
        high_severity: result.issues.filter(i => i.severity === 'HIGH').length,
        medium_severity: result.issues.filter(i => i.severity === 'MEDIUM').length,
        low_severity: result.issues.filter(i => i.severity === 'LOW').length,
        auto_fixable: result.issues.filter(i => i.autoFixable).length
      }
    });
  } catch (error) {
    console.error('[Schema Health] Error during health check:', error);
    next(error);
  } finally {
    await guardian.cleanup();
  }
});

// 자동 수정 엔드포인트
router.post('/health/schema/fix', async (req: Request, res: Response, next: NextFunction) => {
  const guardian = new SchemaGuardian();
  
  try {
    console.log('[Schema Health] Starting auto-fix process...');
    
    // 먼저 현재 상태 확인
    const healthResult = await guardian.checkHealth();
    
    if (healthResult.healthy) {
      return res.json({
        status: 'success',
        message: 'Schema is already healthy',
        fixed: [],
        failed: []
      });
    }
    
    // 자동 수정 가능한 문제만 필터링
    const autoFixable = healthResult.issues.filter(i => i.autoFixable);
    
    if (autoFixable.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No auto-fixable issues found',
        issues: healthResult.issues
      });
    }
    
    // 자동 수정 실행
    const fixResult = await guardian.autoFix(autoFixable);
    
    // 수정 후 재검사
    const finalResult = await guardian.checkHealth();
    
    res.json({
      status: fixResult.failed.length === 0 ? 'success' : 'partial',
      fixed: fixResult.fixed,
      failed: fixResult.failed,
      final_health: {
        healthy: finalResult.healthy,
        remaining_issues: finalResult.issues.length
      }
    });
  } catch (error) {
    console.error('[Schema Health] Error during auto-fix:', error);
    next(error);
  } finally {
    await guardian.cleanup();
  }
});

// 데이터베이스 연결 상태 확인
router.get('/health/database', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // 간단한 쿼리로 연결 테스트
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'connected',
      responseTime: `${responseTime}ms`,
      database: process.env.DATABASE_URL ? 'PostgreSQL' : 'Unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Schema Health] Database connection error:', error);
    res.status(503).json({
      status: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// 예약 데이터 일관성 검사
router.get('/health/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[Schema Health] Checking booking data consistency...');
    
    // 각 회사별 예약 수 확인
    const companyCounts = await prisma.$queryRaw<{companyCode: string, count: bigint}[]>`
      SELECT "companyCode", COUNT(*) as count
      FROM "Booking"
      GROUP BY "companyCode"
      ORDER BY "companyCode"
    `;
    
    // 상태별 예약 수 확인
    const statusCounts = await prisma.$queryRaw<{status: string, count: bigint}[]>`
      SELECT status, COUNT(*) as count
      FROM "Booking"
      GROUP BY status
      ORDER BY status
    `;
    
    // 타입별 예약 수 확인
    const typeCounts = await prisma.$queryRaw<{bookingType: string, count: bigint}[]>`
      SELECT "bookingType", COUNT(*) as count
      FROM "Booking"
      GROUP BY "bookingType"
      ORDER BY "bookingType"
    `;
    
    res.json({
      status: 'ok',
      data: {
        by_company: companyCounts.map(c => ({
          companyCode: c.companyCode,
          count: Number(c.count)
        })),
        by_status: statusCounts.map(s => ({
          status: s.status,
          count: Number(s.count)
        })),
        by_type: typeCounts.map(t => ({
          type: t.bookingType,
          count: Number(t.count)
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Schema Health] Error checking booking consistency:', error);
    next(error);
  }
});

// 메트릭스 수집 엔드포인트
router.get('/health/metrics', async (req: Request, res: Response, next: NextFunction) => {
  const guardian = new SchemaGuardian();
  
  try {
    const healthResult = await guardian.checkHealth();
    
    // Prometheus 형식의 메트릭스
    const metrics = [
      `# HELP schema_health_status Schema health status (1=healthy, 0=unhealthy)`,
      `# TYPE schema_health_status gauge`,
      `schema_health_status ${healthResult.healthy ? 1 : 0}`,
      ``,
      `# HELP schema_issues_total Total number of schema issues`,
      `# TYPE schema_issues_total gauge`,
      `schema_issues_total ${healthResult.issues.length}`,
      ``,
      `# HELP schema_issues_by_severity Number of issues by severity`,
      `# TYPE schema_issues_by_severity gauge`,
      `schema_issues_by_severity{severity="HIGH"} ${healthResult.issues.filter(i => i.severity === 'HIGH').length}`,
      `schema_issues_by_severity{severity="MEDIUM"} ${healthResult.issues.filter(i => i.severity === 'MEDIUM').length}`,
      `schema_issues_by_severity{severity="LOW"} ${healthResult.issues.filter(i => i.severity === 'LOW').length}`,
      ``,
      `# HELP schema_auto_fixable_issues Number of auto-fixable issues`,
      `# TYPE schema_auto_fixable_issues gauge`,
      `schema_auto_fixable_issues ${healthResult.issues.filter(i => i.autoFixable).length}`
    ];
    
    res.type('text/plain').send(metrics.join('\n'));
  } catch (error) {
    console.error('[Schema Health] Error generating metrics:', error);
    next(error);
  } finally {
    await guardian.cleanup();
  }
});

export default router;