/**
 * Monitoring and Performance - Centralized exports
 * Complete monitoring solution with logging, performance tracking, and caching
 */

// Import for internal use
import { LogLevel as LogLevelInternal } from './StructuredLogger';
import { logger as loggerInternal } from './StructuredLogger';
import { performanceMonitor as performanceMonitorInternal } from './PerformanceMonitor';
import { apiCache as apiCacheInternal } from './CacheStrategy';

// Structured Logging
export {
  StructuredLogger,
  PerformanceTracker,
  logger,
  createLogger,
  LogPerformance,
  LogLevel,
  type LogContext,
  type LogEntry,
  type LoggerConfig
} from './StructuredLogger';

// Performance Monitoring
export {
  PerformanceMonitor,
  MetricsCollector,
  AlertSystem,
  performanceMonitor,
  MonitorPerformance,
  type PerformanceMetric,
  type PerformanceAlert,
  type PerformanceReport,
  type PerformanceConfig
} from './PerformanceMonitor';

// Smart Caching
export {
  SmartCache,
  MultiLevelCache,
  AdaptiveTtlStrategy,
  PriorityStrategy,
  apiCache,
  dataCache,
  Cacheable,
  type CacheEntry,
  type CacheStats,
  type CacheConfig,
  type CacheStrategy
} from './CacheStrategy';

// Monitoring configuration presets
export const MonitoringPresets = {
  // Development environment
  DEVELOPMENT: {
    logging: {
      level: LogLevelInternal.DEBUG,
      enableConsole: true,
      enableRemote: false,
      enablePerformanceTracking: true
    },
    performance: {
      enableMetrics: true,
      enableAlerts: false,
      enableReports: false,
      metricsRetentionMs: 60 * 60 * 1000 // 1 hour
    },
    cache: {
      maxSize: 500,
      maxMemoryMB: 50,
      defaultTtl: 5 * 60 * 1000 // 5 minutes
    }
  },

  // Production environment
  PRODUCTION: {
    logging: {
      level: LogLevelInternal.INFO,
      enableConsole: false,
      enableRemote: true,
      enablePerformanceTracking: true,
      remoteEndpoint: '/api/logs'
    },
    performance: {
      enableMetrics: true,
      enableAlerts: true,
      enableReports: true,
      metricsRetentionMs: 24 * 60 * 60 * 1000 // 24 hours
    },
    cache: {
      maxSize: 2000,
      maxMemoryMB: 200,
      defaultTtl: 15 * 60 * 1000 // 15 minutes
    }
  },

  // Testing environment
  TESTING: {
    logging: {
      level: LogLevelInternal.WARN,
      enableConsole: false,
      enableRemote: false,
      enablePerformanceTracking: false
    },
    performance: {
      enableMetrics: false,
      enableAlerts: false,
      enableReports: false
    },
    cache: {
      maxSize: 100,
      maxMemoryMB: 10,
      defaultTtl: 60 * 1000 // 1 minute
    }
  }
};

// Utility to setup monitoring for specific environment
export function setupMonitoring(environment: keyof typeof MonitoringPresets): void {
  const preset = MonitoringPresets[environment];
  
  // Configure logger
  loggerInternal.updateConfig(preset.logging);
  
  // Configure performance monitor
  performanceMonitorInternal.updateConfig(preset.performance);
  
  // Configure cache
  apiCacheInternal.updateConfig(preset.cache);
  
  loggerInternal.info(`Monitoring configured for ${environment} environment`, {
    preset,
    operation: 'monitoring_setup'
  }, ['monitoring', 'setup']);
}