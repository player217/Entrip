import { Router, Request, Response } from 'express';
import { getIntegrationHealth, getMetrics } from '../metrics/integrations';
import { getExternalCallStats, getProviderErrorRate } from '../middleware/external-logging';
import { FxService } from '../integrations/fx/fx.service';
import { FlightService } from '../integrations/flights/flights.service';
import prisma from '../lib/prisma';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Basic database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Integration services health check
 */
router.get('/integrations', async (req: Request, res: Response) => {
  try {
    const health = await getIntegrationHealth();
    
    // Return 503 if any critical service is down
    const statusCode = health.status === 'down' ? 503 : 200;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'down',
      services: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date()
    });
  }
});

/**
 * Detailed integration statistics
 */
router.get('/integrations/stats', async (req: Request, res: Response) => {
  try {
    const timeRange = parseInt(req.query.minutes as string) || 60;
    const provider = req.query.provider as string;
    
    const [callStats, fxService, flightService] = await Promise.all([
      getExternalCallStats(timeRange, provider),
      new FxService().getHealthStatus(),
      new FlightService().getHealthStatus()
    ]);

    // Get provider-specific error rates
    const providerHealthDetails: Record<string, any> = {};
    for (const providerName of Object.keys(callStats.callsPerProvider)) {
      providerHealthDetails[providerName] = await getProviderErrorRate(providerName, timeRange);
    }

    res.json({
      timeRangeMinutes: timeRange,
      callStatistics: callStats,
      serviceHealth: {
        fx: fxService,
        flights: flightService
      },
      providerHealth: providerHealthDetails,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

/**
 * Circuit breaker status endpoint
 */
router.get('/integrations/circuits', async (req: Request, res: Response) => {
  try {
    const providers = await prisma.integrationProvider.findMany({
      select: {
        name: true,
        status: true,
        errorCount: true,
        lastSuccessAt: true,
        lastErrorAt: true,
        circuitOpenUntil: true
      },
      orderBy: { name: 'asc' }
    });

    const circuits = providers.map(provider => {
      const now = new Date();
      const isOpen = provider.circuitOpenUntil && provider.circuitOpenUntil > now;
      
      let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      if (!provider.circuitOpenUntil || provider.circuitOpenUntil <= now) {
        state = provider.errorCount > 0 ? 'HALF_OPEN' : 'CLOSED';
      } else {
        state = 'OPEN';
      }

      return {
        provider: provider.name,
        state,
        status: provider.status,
        errorCount: provider.errorCount,
        lastSuccess: provider.lastSuccessAt,
        lastError: provider.lastErrorAt,
        circuitOpenUntil: provider.circuitOpenUntil,
        healthScore: calculateHealthScore(provider)
      };
    });

    res.json({
      circuits,
      summary: {
        total: circuits.length,
        healthy: circuits.filter(c => c.state === 'CLOSED' && c.status === 'HEALTHY').length,
        degraded: circuits.filter(c => c.state === 'HALF_OPEN' || c.status === 'DEGRADED').length,
        down: circuits.filter(c => c.state === 'OPEN' || c.status === 'DOWN').length
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

/**
 * Cache status endpoint
 */
router.get('/integrations/cache', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get cache statistics
    const [fxCacheStats, flightCacheStats] = await Promise.all([
      prisma.fxRateCache.groupBy({
        by: ['source'],
        where: { fetchedAt: { gte: oneHourAgo } },
        _count: { id: true },
        _avg: { ttlSec: true },
        _max: { fetchedAt: true }
      }),
      prisma.flightStatusCache.groupBy({
        by: ['source'],
        where: { fetchedAt: { gte: oneHourAgo } },
        _count: { id: true },
        _avg: { ttlSec: true },
        _max: { fetchedAt: true }
      })
    ]);

    // Calculate cache freshness
    const fxCacheDetails = await Promise.all(
      fxCacheStats.map(async (stat) => {
        const staleCacheCount = await prisma.fxRateCache.count({
          where: {
            source: stat.source,
            fetchedAt: { lt: new Date(now.getTime() - (stat._avg.ttlSec || 3600) * 1000) }
          }
        });

        return {
          source: stat.source,
          totalEntries: stat._count.id,
          staleEntries: staleCacheCount,
          freshness: ((stat._count.id - staleCacheCount) / stat._count.id) * 100,
          lastUpdated: stat._max.fetchedAt,
          averageTtl: stat._avg.ttlSec
        };
      })
    );

    const flightCacheDetails = await Promise.all(
      flightCacheStats.map(async (stat) => {
        const staleCacheCount = await prisma.flightStatusCache.count({
          where: {
            source: stat.source,
            fetchedAt: { lt: new Date(now.getTime() - (stat._avg.ttlSec || 300) * 1000) }
          }
        });

        return {
          source: stat.source,
          totalEntries: stat._count.id,
          staleEntries: staleCacheCount,
          freshness: ((stat._count.id - staleCacheCount) / stat._count.id) * 100,
          lastUpdated: stat._max.fetchedAt,
          averageTtl: stat._avg.ttlSec
        };
      })
    );

    res.json({
      fxRatesCache: fxCacheDetails,
      flightStatusCache: flightCacheDetails,
      summary: {
        totalCacheEntries: fxCacheStats.reduce((sum, s) => sum + s._count.id, 0) + 
                          flightCacheStats.reduce((sum, s) => sum + s._count.id, 0),
        averageFreshness: calculateAverageFreshness([...fxCacheDetails, ...flightCacheDetails])
      },
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

/**
 * Provider management endpoints
 */

// Reset circuit breaker
router.post('/integrations/circuits/:provider/reset', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    
    await prisma.integrationProvider.update({
      where: { name: provider },
      data: {
        status: 'HEALTHY',
        errorCount: 0,
        circuitOpenUntil: null,
        lastSuccessAt: new Date()
      }
    });

    res.json({
      message: `Circuit breaker reset for provider: ${provider}`,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(404).json({
      error: `Provider not found: ${req.params.provider}`,
      timestamp: new Date()
    });
  }
});

// Update provider configuration
router.put('/integrations/providers/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { baseUrl, status } = req.body;

    const updatedProvider = await prisma.integrationProvider.upsert({
      where: { name: provider },
      update: {
        ...(baseUrl && { baseUrl }),
        ...(status && { status })
      },
      create: {
        name: provider,
        baseUrl: baseUrl || '',
        status: status || 'HEALTHY'
      }
    });

    res.json({
      provider: updatedProvider,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate metrics'
    });
  }
});

// Helper functions
function calculateHealthScore(provider: any): number {
  const now = new Date();
  let score = 100;

  // Deduct for errors
  score -= Math.min(provider.errorCount * 10, 50);

  // Deduct for being down
  if (provider.status === 'DOWN') score -= 50;
  else if (provider.status === 'DEGRADED') score -= 25;

  // Deduct for circuit being open
  if (provider.circuitOpenUntil && provider.circuitOpenUntil > now) score -= 30;

  // Deduct for no recent success
  if (!provider.lastSuccessAt) {
    score -= 20;
  } else {
    const hoursSinceSuccess = (now.getTime() - provider.lastSuccessAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSuccess > 24) score -= 20;
    else if (hoursSinceSuccess > 1) score -= Math.min(hoursSinceSuccess * 2, 20);
  }

  return Math.max(0, Math.min(100, score));
}

function calculateAverageFreshness(cacheDetails: Array<{ freshness: number }>): number {
  if (cacheDetails.length === 0) return 100;
  
  const totalFreshness = cacheDetails.reduce((sum, cache) => sum + cache.freshness, 0);
  return Math.round(totalFreshness / cacheDetails.length);
}

export default router;