/**
 * Performance Monitoring System
 * Comprehensive performance tracking with metrics collection, analysis, and alerting
 */

import { logger } from './StructuredLogger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: number;
}

export interface PerformanceReport {
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    throughput: number; // requests per second
  };
  breakdown: {
    byEndpoint: Record<string, {
      count: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
    byMethod: Record<string, {
      count: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
    byStatusCode: Record<string, number>;
  };
  trends: {
    responseTimeOverTime: Array<{ timestamp: number; value: number }>;
    throughputOverTime: Array<{ timestamp: number; value: number }>;
    errorRateOverTime: Array<{ timestamp: number; value: number }>;
  };
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  enableAlerts: boolean;
  enableReports: boolean;
  metricsRetentionMs: number;
  reportingIntervalMs: number;
  alertCooldownMs: number;
  maxMetricsInMemory: number;
  enableRealTimeMonitoring: boolean;
}

/**
 * Performance Metrics Collector
 */
export class MetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number;

  constructor(maxMetrics: number = 10000) {
    this.maxMetrics = maxMetrics;
  }

  /**
   * Record a counter metric (monotonically increasing)
   */
  recordCounter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      unit: 'count',
      timestamp: Date.now(),
      labels,
      type: 'counter'
    });
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  recordGauge(name: string, value: number, unit: string = 'units', labels: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      labels,
      type: 'gauge'
    });
  }

  /**
   * Record a histogram metric (distribution of values)
   */
  recordHistogram(name: string, value: number, unit: string = 'ms', labels: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      labels,
      type: 'histogram'
    });
  }

  /**
   * Record a summary metric (aggregated values)
   */
  recordSummary(name: string, value: number, unit: string = 'ms', labels: Record<string, string> = {}): void {
    this.addMetric({
      name,
      value,
      unit,
      timestamp: Date.now(),
      labels,
      type: 'summary'
    });
  }

  /**
   * Get metrics by name and time range
   */
  getMetrics(
    name?: string,
    startTime?: number,
    endTime?: number,
    labels?: Record<string, string>
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (startTime) {
      filtered = filtered.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(m => m.timestamp <= endTime);
    }

    if (labels) {
      filtered = filtered.filter(m => {
        return Object.entries(labels).every(([key, value]) => m.labels[key] === value);
      });
    }

    return filtered;
  }

  /**
   * Get unique metric names
   */
  getMetricNames(): string[] {
    return [...new Set(this.metrics.map(m => m.name))];
  }

  /**
   * Calculate percentiles for histogram metrics
   */
  calculatePercentiles(name: string, percentiles: number[] = [50, 95, 99]): Record<string, number> {
    const values = this.getMetrics(name)
      .filter(m => m.type === 'histogram')
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (values.length === 0) return {};

    const result: Record<string, number> = {};
    
    for (const percentile of percentiles) {
      const index = Math.ceil((percentile / 100) * values.length) - 1;
      result[`p${percentile}`] = values[index] ?? values[values.length - 1] ?? 0;
    }

    return result;
  }

  /**
   * Clear old metrics beyond retention period
   */
  cleanup(retentionMs: number): number {
    const cutoffTime = Date.now() - retentionMs;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    return initialCount - this.metrics.length;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): { count: number; maxCount: number; memoryPressure: number } {
    return {
      count: this.metrics.length,
      maxCount: this.maxMetrics,
      memoryPressure: this.metrics.length / this.maxMetrics
    };
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Enforce memory limits
    if (this.metrics.length > this.maxMetrics) {
      // Remove oldest metrics (FIFO)
      const toRemove = this.metrics.length - this.maxMetrics;
      this.metrics.splice(0, toRemove);
    }
  }
}

/**
 * Performance Alert System
 */
export class AlertSystem {
  private alerts: Map<string, PerformanceAlert> = new Map();
  private metricsCollector: MetricsCollector;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * Add or update an alert
   */
  addAlert(alert: PerformanceAlert): void {
    this.alerts.set(alert.id, alert);
  }

  /**
   * Remove an alert
   */
  removeAlert(id: string): boolean {
    return this.alerts.delete(id);
  }

  /**
   * Enable/disable an alert
   */
  setAlertEnabled(id: string, enabled: boolean): void {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.enabled = enabled;
    }
  }

  /**
   * Check all alerts and trigger if necessary
   */
  checkAlerts(): void {
    const now = Date.now();

    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      // Check cooldown
      if (alert.lastTriggered && (now - alert.lastTriggered) < alert.cooldownMs) {
        continue;
      }

      // Get recent metric values
      const recentMetrics = this.metricsCollector.getMetrics(
        alert.metric,
        now - 60000 // Last minute
      );

      if (recentMetrics.length === 0) continue;

      // Calculate current value (average for simplicity)
      const currentValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

      // Check threshold
      if (this.shouldTriggerAlert(currentValue, alert)) {
        this.triggerAlert(alert, currentValue);
        alert.lastTriggered = now;
      }
    }
  }

  /**
   * Get all alerts
   */
  getAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: PerformanceAlert['severity']): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.severity === severity);
  }

  private shouldTriggerAlert(value: number, alert: PerformanceAlert): boolean {
    switch (alert.comparison) {
      case 'gt': return value > alert.threshold;
      case 'lt': return value < alert.threshold;
      case 'eq': return value === alert.threshold;
      case 'gte': return value >= alert.threshold;
      case 'lte': return value <= alert.threshold;
      default: return false;
    }
  }

  private triggerAlert(alert: PerformanceAlert, currentValue: number): void {
    const message = alert.message.replace('{value}', currentValue.toString());
    
    logger.warn(`Performance Alert: ${message}`, {
      alertId: alert.id,
      metric: alert.metric,
      threshold: alert.threshold,
      currentValue,
      severity: alert.severity,
      operation: 'performance_alert'
    }, ['performance', 'alert', alert.severity]);
  }
}

/**
 * Main Performance Monitor
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metricsCollector: MetricsCollector;
  private alertSystem: AlertSystem;
  private reportingTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableAlerts: true,
      enableReports: false,
      metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
      reportingIntervalMs: 5 * 60 * 1000, // 5 minutes
      alertCooldownMs: 60 * 1000, // 1 minute
      maxMetricsInMemory: 10000,
      enableRealTimeMonitoring: true,
      ...config
    };

    this.metricsCollector = new MetricsCollector(this.config.maxMetricsInMemory);
    this.alertSystem = new AlertSystem(this.metricsCollector);

    this.setupTimers();
    this.setupDefaultAlerts();
  }

  /**
   * Record API request performance
   */
  recordApiRequest(
    method: string,
    url: string,
    duration: number,
    statusCode: number,
    success: boolean
  ): void {
    if (!this.config.enableMetrics) return;

    const labels = {
      method: method.toUpperCase(),
      endpoint: this.normalizeUrl(url),
      status_code: statusCode.toString(),
      success: success.toString()
    };

    // Record request count
    this.metricsCollector.recordCounter('api_requests_total', 1, labels);

    // Record response time
    this.metricsCollector.recordHistogram('api_request_duration_ms', duration, 'ms', labels);

    // Record error rate
    if (!success) {
      this.metricsCollector.recordCounter('api_errors_total', 1, labels);
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(): void {
    if (!this.config.enableMetrics) return;

    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      
      this.metricsCollector.recordGauge('memory_heap_used_bytes', usage.heapUsed, 'bytes');
      this.metricsCollector.recordGauge('memory_heap_total_bytes', usage.heapTotal, 'bytes');
      this.metricsCollector.recordGauge('memory_external_bytes', usage.external, 'bytes');
      this.metricsCollector.recordGauge('memory_rss_bytes', usage.rss, 'bytes');
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(
    name: string,
    value: number,
    type: PerformanceMetric['type'] = 'gauge',
    unit: string = 'units',
    labels: Record<string, string> = {}
  ): void {
    if (!this.config.enableMetrics) return;

    switch (type) {
      case 'counter':
        this.metricsCollector.recordCounter(name, value, labels);
        break;
      case 'gauge':
        this.metricsCollector.recordGauge(name, value, unit, labels);
        break;
      case 'histogram':
        this.metricsCollector.recordHistogram(name, value, unit, labels);
        break;
      case 'summary':
        this.metricsCollector.recordSummary(name, value, unit, labels);
        break;
    }
  }

  /**
   * Generate performance report
   */
  generateReport(timeRangeMs: number = 60 * 60 * 1000): PerformanceReport {
    const now = Date.now();
    const startTime = now - timeRangeMs;

    // Get API request metrics
    const requestMetrics = this.metricsCollector.getMetrics('api_requests_total', startTime, now);
    const durationMetrics = this.metricsCollector.getMetrics('api_request_duration_ms', startTime, now);
    const errorMetrics = this.metricsCollector.getMetrics('api_errors_total', startTime, now);

    // Calculate summary
    const totalRequests = requestMetrics.reduce((sum, m) => sum + m.value, 0);
    const totalErrors = errorMetrics.reduce((sum, m) => sum + m.value, 0);
    const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 100;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    const durations = durationMetrics.map(m => m.value);
    const averageResponseTime = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const percentiles = this.metricsCollector.calculatePercentiles('api_request_duration_ms');
    const throughput = totalRequests / (timeRangeMs / 1000); // requests per second

    // Calculate breakdowns
    const byEndpoint: Record<string, any> = {};
    const byMethod: Record<string, any> = {};
    const byStatusCode: Record<string, number> = {};

    for (const metric of requestMetrics) {
      const endpoint = metric.labels.endpoint || 'unknown';
      const method = metric.labels.method || 'unknown';
      const statusCode = metric.labels.status_code || 'unknown';

      // By endpoint
      if (!byEndpoint[endpoint]) {
        byEndpoint[endpoint] = { count: 0, avgResponseTime: 0, errorRate: 0 };
      }
      byEndpoint[endpoint].count += metric.value;

      // By method
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, avgResponseTime: 0, errorRate: 0 };
      }
      byMethod[method].count += metric.value;

      // By status code
      byStatusCode[statusCode] = (byStatusCode[statusCode] || 0) + metric.value;
    }

    // Calculate average response times and error rates for breakdowns
    for (const endpoint of Object.keys(byEndpoint)) {
      const endpointDurations = durationMetrics
        .filter(m => m.labels.endpoint === endpoint)
        .map(m => m.value);
      byEndpoint[endpoint].avgResponseTime = endpointDurations.length > 0
        ? endpointDurations.reduce((sum, d) => sum + d, 0) / endpointDurations.length
        : 0;

      const endpointErrors = errorMetrics
        .filter(m => m.labels.endpoint === endpoint)
        .reduce((sum, m) => sum + m.value, 0);
      byEndpoint[endpoint].errorRate = byEndpoint[endpoint].count > 0
        ? (endpointErrors / byEndpoint[endpoint].count) * 100
        : 0;
    }

    // Generate trends (simplified - would need more sophisticated bucketing in production)
    const trendBuckets = 10;
    const bucketSize = timeRangeMs / trendBuckets;
    const responseTimeOverTime: Array<{ timestamp: number; value: number }> = [];
    const throughputOverTime: Array<{ timestamp: number; value: number }> = [];
    const errorRateOverTime: Array<{ timestamp: number; value: number }> = [];

    for (let i = 0; i < trendBuckets; i++) {
      const bucketStart = startTime + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;

      const bucketDurations = durationMetrics
        .filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd)
        .map(m => m.value);
      
      const bucketRequests = requestMetrics
        .filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd)
        .reduce((sum, m) => sum + m.value, 0);

      const bucketErrors = errorMetrics
        .filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd)
        .reduce((sum, m) => sum + m.value, 0);

      responseTimeOverTime.push({
        timestamp: bucketStart,
        value: bucketDurations.length > 0 
          ? bucketDurations.reduce((sum, d) => sum + d, 0) / bucketDurations.length 
          : 0
      });

      throughputOverTime.push({
        timestamp: bucketStart,
        value: bucketRequests / (bucketSize / 1000)
      });

      errorRateOverTime.push({
        timestamp: bucketStart,
        value: bucketRequests > 0 ? (bucketErrors / bucketRequests) * 100 : 0
      });
    }

    return {
      timeRange: { start: startTime, end: now },
      summary: {
        totalRequests,
        successRate,
        averageResponseTime,
        p95ResponseTime: percentiles.p95 || 0,
        p99ResponseTime: percentiles.p99 || 0,
        errorRate,
        throughput
      },
      breakdown: {
        byEndpoint,
        byMethod,
        byStatusCode
      },
      trends: {
        responseTimeOverTime,
        throughputOverTime,
        errorRateOverTime
      }
    };
  }

  /**
   * Add performance alert
   */
  addAlert(alert: PerformanceAlert): void {
    this.alertSystem.addAlert(alert);
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Get current alerts
   */
  getAlerts(): PerformanceAlert[] {
    return this.alertSystem.getAlerts();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.setupTimers();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.reportingTimer) clearInterval(this.reportingTimer);
    if (this.alertCheckTimer) clearInterval(this.alertCheckTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    this.metricsCollector.clear();
  }

  private normalizeUrl(url: string): string {
    // Remove query parameters and normalize path
    try {
      const urlObj = new URL(url, 'http://localhost');
      return urlObj.pathname.replace(/\/\d+/g, '/:id'); // Replace IDs with :id
    } catch {
      return url.split('?')[0] ?? url;
    }
  }

  private setupTimers(): void {
    // Clear existing timers
    if (this.reportingTimer) clearInterval(this.reportingTimer);
    if (this.alertCheckTimer) clearInterval(this.alertCheckTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    // Setup reporting timer
    if (this.config.enableReports && this.config.reportingIntervalMs > 0) {
      this.reportingTimer = setInterval(() => {
        const report = this.generateReport();
        logger.info('Performance Report Generated', {
          operation: 'performance_report',
          totalRequests: report.summary.totalRequests,
          successRate: report.summary.successRate,
          averageResponseTime: report.summary.averageResponseTime,
          throughput: report.summary.throughput
        }, ['performance', 'report']);
      }, this.config.reportingIntervalMs);
    }

    // Setup alert checking timer
    if (this.config.enableAlerts) {
      this.alertCheckTimer = setInterval(() => {
        this.alertSystem.checkAlerts();
      }, 10000); // Check every 10 seconds
    }

    // Setup cleanup timer
    this.cleanupTimer = setInterval(() => {
      const removed = this.metricsCollector.cleanup(this.config.metricsRetentionMs);
      if (removed > 0) {
        logger.debug(`Cleaned up ${removed} old metrics`, {
          operation: 'metrics_cleanup',
          removedCount: removed
        }, ['performance', 'cleanup']);
      }
    }, 60000); // Cleanup every minute
  }

  private setupDefaultAlerts(): void {
    // High error rate alert
    this.addAlert({
      id: 'high_error_rate',
      metric: 'api_errors_total',
      threshold: 5, // 5% error rate
      comparison: 'gt',
      severity: 'high',
      message: 'High error rate detected: {value}%',
      enabled: true,
      cooldownMs: this.config.alertCooldownMs
    });

    // High response time alert
    this.addAlert({
      id: 'high_response_time',
      metric: 'api_request_duration_ms',
      threshold: 2000, // 2 seconds
      comparison: 'gt',
      severity: 'medium',
      message: 'High response time detected: {value}ms',
      enabled: true,
      cooldownMs: this.config.alertCooldownMs
    });

    // Memory usage alert (if available)
    if (typeof process !== 'undefined') {
      this.addAlert({
        id: 'high_memory_usage',
        metric: 'memory_heap_used_bytes',
        threshold: 512 * 1024 * 1024, // 512MB
        comparison: 'gt',
        severity: 'medium',
        message: 'High memory usage detected: {value} bytes',
        enabled: true,
        cooldownMs: this.config.alertCooldownMs * 2 // Longer cooldown for memory alerts
      });
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring decorator
 */
export function MonitorPerformance(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        performanceMonitor.recordMetric(
          `${name}_duration_ms`,
          duration,
          'histogram',
          'ms',
          { method: propertyKey, success: 'true' }
        );
        
        performanceMonitor.recordMetric(
          `${name}_calls_total`,
          1,
          'counter',
          'count',
          { method: propertyKey, success: 'true' }
        );

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        performanceMonitor.recordMetric(
          `${name}_duration_ms`,
          duration,
          'histogram',
          'ms',
          { method: propertyKey, success: 'false' }
        );
        
        performanceMonitor.recordMetric(
          `${name}_calls_total`,
          1,
          'counter',
          'count',
          { method: propertyKey, success: 'false' }
        );

        throw error;
      }
    };

    return descriptor;
  };
}