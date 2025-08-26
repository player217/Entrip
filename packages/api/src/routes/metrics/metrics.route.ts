import { Router } from 'express';
import { getCacheStats } from '../../middlewares/cache.middleware';

const router: Router = Router();

/**
 * GET /api/v2/metrics
 * Returns performance metrics
 */
router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cacheStats = getCacheStats();

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      human: formatUptime(uptime)
    },
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
      arrayBuffers: formatBytes(memoryUsage.arrayBuffers)
    },
    cache: {
      ...cacheStats,
      memoryUsage: formatBytes(cacheStats.memoryUsage)
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * GET /api/v2/metrics/prometheus
 * Returns metrics in Prometheus format
 */
router.get('/prometheus', (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cacheStats = getCacheStats();

  const prometheusMetrics = `
# HELP nodejs_uptime_seconds Process uptime in seconds
# TYPE nodejs_uptime_seconds counter
nodejs_uptime_seconds ${uptime}

# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}
nodejs_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}

# HELP cache_entries_total Number of cache entries
# TYPE cache_entries_total gauge
cache_entries_total{state="valid"} ${cacheStats.validEntries}
cache_entries_total{state="expired"} ${cacheStats.expiredEntries}
cache_entries_total{state="total"} ${cacheStats.totalEntries}

# HELP cache_memory_usage_bytes Cache memory usage in bytes
# TYPE cache_memory_usage_bytes gauge
cache_memory_usage_bytes ${cacheStats.memoryUsage}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to format uptime
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

export default router;