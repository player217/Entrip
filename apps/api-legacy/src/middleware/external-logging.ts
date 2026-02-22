import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

/**
 * Log external API calls for monitoring and debugging
 */
export async function logExternalCall(
  provider: string,
  endpoint: string,
  method: string,
  statusCode?: number,
  errorType?: string,
  durationMs?: number,
  requestHash?: string
): Promise<void> {
  try {
    await prisma.externalCallLog.create({
      data: {
        providerName: provider,
        endpoint,
        method,
        statusCode: statusCode ?? null,
        errorType,
        durationMs: durationMs ?? 0,
        requestHash: requestHash ?? `${method}:${endpoint}:${Date.now()}`
      }
    });
  } catch (error) {
    // Don't throw on logging errors - just log to console
    console.error('Failed to log external call:', {
      provider,
      endpoint,
      method,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Create a hash for request deduplication
 */
export function createRequestHash(method: string, url: string, body?: any): string {
  const content = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
  // Simple hash function (for production, consider using crypto)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Express middleware to automatically log external API calls
 * Use this with axios interceptors for comprehensive logging
 */
export function externalCallLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Store start time in request for duration calculation
    (req as any).externalCallStartTime = startTime;
    
    // Override res.json to capture response details
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const duration = Date.now() - startTime;
      
      // Log the call if it's an external API route
      if (req.path.startsWith('/api/external/') || 
          req.path.includes('/integration/') ||
          req.headers['x-external-call'] === 'true') {
        
        const provider = req.headers['x-provider'] as string || 'unknown';
        const endpoint = req.path;
        const method = req.method;
        const statusCode = res.statusCode;
        const errorType = res.statusCode >= 400 ? `HTTP_${res.statusCode}` : null;
        const requestHash = createRequestHash(method, endpoint, req.body);
        
        // Fire and forget logging
        setImmediate(() => {
          logExternalCall(provider, endpoint, method, statusCode, errorType, duration, requestHash)
            .catch(error => console.error('Async external call logging failed:', error));
        });
      }
      
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Get external call statistics for monitoring
 */
export async function getExternalCallStats(
  timeRangeMinutes = 60,
  provider?: string
): Promise<{
  totalCalls: number;
  successRate: number;
  averageDurationMs: number;
  errorBreakdown: Record<string, number>;
  callsPerProvider: Record<string, number>;
  recentErrors: Array<{
    provider: string;
    endpoint: string;
    errorType: string;
    occurredAt: Date;
    durationMs: number;
  }>;
}> {
  const since = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
  
  const whereClause = {
    occurredAt: { gte: since },
    ...(provider && { providerName: provider })
  };

  const [totalCalls, successfulCalls, avgDuration, errorStats, providerStats, recentErrors] = await Promise.all([
    // Total calls
    prisma.externalCallLog.count({ where: whereClause }),
    
    // Successful calls (2xx status codes)
    prisma.externalCallLog.count({
      where: {
        ...whereClause,
        statusCode: { gte: 200, lt: 300 }
      }
    }),
    
    // Average duration
    prisma.externalCallLog.aggregate({
      where: whereClause,
      _avg: { durationMs: true }
    }),
    
    // Error breakdown
    prisma.externalCallLog.groupBy({
      by: ['errorType'],
      where: {
        ...whereClause,
        errorType: { not: null }
      },
      _count: { errorType: true }
    }),
    
    // Calls per provider
    prisma.externalCallLog.groupBy({
      by: ['providerName'],
      where: whereClause,
      _count: { providerName: true }
    }),
    
    // Recent errors (last 10)
    prisma.externalCallLog.findMany({
      where: {
        ...whereClause,
        errorType: { not: null }
      },
      select: {
        providerName: true,
        endpoint: true,
        errorType: true,
        occurredAt: true,
        durationMs: true
      },
      orderBy: { occurredAt: 'desc' },
      take: 10
    })
  ]);

  const errorBreakdown = errorStats.reduce((acc, stat) => {
    if (stat.errorType) {
      acc[stat.errorType] = stat._count.errorType;
    }
    return acc;
  }, {} as Record<string, number>);

  const callsPerProvider = providerStats.reduce((acc, stat) => {
    acc[stat.providerName] = stat._count.providerName;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalCalls,
    successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100,
    averageDurationMs: Math.round(avgDuration._avg.durationMs || 0),
    errorBreakdown,
    callsPerProvider,
    recentErrors: recentErrors.map(error => ({
      provider: error.providerName,
      endpoint: error.endpoint,
      errorType: error.errorType!,
      occurredAt: error.occurredAt,
      durationMs: error.durationMs
    }))
  };
}

/**
 * Clean up old external call logs (for maintenance)
 */
export async function cleanupOldExternalCallLogs(daysToKeep = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const deleteResult = await prisma.externalCallLog.deleteMany({
    where: {
      occurredAt: { lt: cutoffDate }
    }
  });
  
  console.log(`Cleaned up ${deleteResult.count} external call logs older than ${daysToKeep} days`);
  return deleteResult.count;
}

/**
 * Get error rate for specific provider over time periods
 */
export async function getProviderErrorRate(
  providerName: string,
  timeRangeMinutes = 60
): Promise<{
  totalCalls: number;
  errorRate: number;
  last5MinutesErrorRate: number;
  isHealthy: boolean;
}> {
  const now = new Date();
  const since = new Date(now.getTime() - timeRangeMinutes * 60 * 1000);
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

  const [totalCalls, errorCalls, recent5MinCalls, recent5MinErrors] = await Promise.all([
    prisma.externalCallLog.count({
      where: { providerName, occurredAt: { gte: since } }
    }),
    prisma.externalCallLog.count({
      where: { 
        providerName, 
        occurredAt: { gte: since },
        OR: [
          { statusCode: { gte: 400 } },
          { errorType: { not: null } }
        ]
      }
    }),
    prisma.externalCallLog.count({
      where: { providerName, occurredAt: { gte: last5Minutes } }
    }),
    prisma.externalCallLog.count({
      where: {
        providerName,
        occurredAt: { gte: last5Minutes },
        OR: [
          { statusCode: { gte: 400 } },
          { errorType: { not: null } }
        ]
      }
    })
  ]);

  const errorRate = totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;
  const last5MinutesErrorRate = recent5MinCalls > 0 ? (recent5MinErrors / recent5MinCalls) * 100 : 0;

  // Provider is unhealthy if error rate > 10% overall or > 25% in last 5 minutes
  const isHealthy = errorRate <= 10 && last5MinutesErrorRate <= 25;

  return {
    totalCalls,
    errorRate,
    last5MinutesErrorRate,
    isHealthy
  };
}