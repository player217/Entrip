/**
 * Performance Test Suite
 * Comprehensive performance testing utilities for API client and system performance validation
 */

import { logger } from '../monitoring/StructuredLogger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { TestContext, Assert } from './IntegrationTestFramework';

// =====================================
// Performance Test Types
// =====================================

export interface PerformanceTestConfig {
  duration: number; // Test duration in milliseconds
  concurrency: number; // Number of concurrent operations
  warmupTime: number; // Warmup period in milliseconds
  cooldownTime: number; // Cooldown period in milliseconds
  maxResponseTime: number; // Maximum acceptable response time in milliseconds
  minThroughput: number; // Minimum acceptable requests per second
  errorThreshold: number; // Maximum acceptable error rate percentage
  rampUpTime: number; // Time to ramp up to full concurrency
  rampDownTime: number; // Time to ramp down from full concurrency
}

export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
  responseTimes: number[];
  errors: Array<{ timestamp: number; error: Error }>;
  memoryUsage?: {
    start: number;
    end: number;
    peak: number;
    delta: number;
  };
}

export interface LoadTestResult {
  config: PerformanceTestConfig;
  metrics: PerformanceMetrics;
  success: boolean;
  failures: string[];
  recommendations: string[];
  charts?: {
    responseTimeOverTime: Array<{ timestamp: number; value: number }>;
    throughputOverTime: Array<{ timestamp: number; value: number }>;
    errorRateOverTime: Array<{ timestamp: number; value: number }>;
  };
}

export interface PerformanceAssertion {
  name: string;
  assertion: (metrics: PerformanceMetrics) => boolean;
  message: string;
}

// =====================================
// Performance Test Runner
// =====================================

export class PerformanceTestRunner {
  private defaultConfig: PerformanceTestConfig = {
    duration: 60000, // 1 minute
    concurrency: 10,
    warmupTime: 5000, // 5 seconds
    cooldownTime: 5000, // 5 seconds
    maxResponseTime: 5000, // 5 seconds
    minThroughput: 1, // 1 RPS minimum
    errorThreshold: 5, // 5% error rate
    rampUpTime: 10000, // 10 seconds
    rampDownTime: 5000 // 5 seconds
  };

  async runPerformanceTest(
    name: string,
    testFn: (context: TestContext) => Promise<void>,
    context: TestContext,
    config: Partial<PerformanceTestConfig> = {}
  ): Promise<LoadTestResult> {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    logger.info(`Starting performance test: ${name}`, {
      config: fullConfig,
      operation: 'performance_test_start'
    }, ['test', 'performance', 'start']);

    const startTime = Date.now();
    const responseTimes: number[] = [];
    const errors: Array<{ timestamp: number; error: Error }> = [];
    const metrics: Partial<PerformanceMetrics> = {};

    // Memory tracking
    const startMemory = this.getMemoryUsage();
    let peakMemory = startMemory;

    try {
      // Warmup phase
      if (fullConfig.warmupTime > 0) {
        await this.runWarmup(testFn, context, fullConfig);
      }

      // Main performance test
      const testStartTime = Date.now();
      const results = await this.runLoadTest(testFn, context, fullConfig);
      
      // Collect results
      responseTimes.push(...results.responseTimes);
      errors.push(...results.errors);
      
      // Memory tracking
      const endMemory = this.getMemoryUsage();
      if (endMemory > peakMemory) peakMemory = endMemory;

      // Calculate metrics
      const totalDuration = Date.now() - testStartTime;
      const calculatedMetrics = this.calculateMetrics(
        responseTimes,
        errors,
        totalDuration,
        startMemory,
        endMemory,
        peakMemory
      );

      // Generate assertions and recommendations
      const assertions = this.getPerformanceAssertions(fullConfig);
      const failures = this.validateAssertions(calculatedMetrics, assertions);
      const recommendations = this.generateRecommendations(calculatedMetrics, fullConfig);

      // Generate charts data
      const charts = this.generateChartsData(results.timeline, fullConfig);

      const result: LoadTestResult = {
        config: fullConfig,
        metrics: calculatedMetrics,
        success: failures.length === 0,
        failures,
        recommendations,
        charts
      };

      logger.info(`Performance test completed: ${name}`, {
        success: result.success,
        metrics: {
          throughput: calculatedMetrics.throughput,
          avgResponseTime: calculatedMetrics.averageResponseTime,
          errorRate: calculatedMetrics.errorRate
        },
        operation: 'performance_test_complete'
      }, ['test', 'performance', result.success ? 'success' : 'failure']);

      return result;

    } catch (error) {
      logger.error(`Performance test failed: ${name}`, error as Error, {
        operation: 'performance_test_error'
      }, ['test', 'performance', 'error']);

      throw error;
    }
  }

  private async runWarmup(
    testFn: (context: TestContext) => Promise<void>,
    context: TestContext,
    config: PerformanceTestConfig
  ): Promise<void> {
    logger.debug('Starting warmup phase', { duration: config.warmupTime });
    
    const warmupEnd = Date.now() + config.warmupTime;
    const promises: Promise<void>[] = [];

    while (Date.now() < warmupEnd) {
      for (let i = 0; i < Math.min(config.concurrency, 5); i++) {
        promises.push(
          testFn(context).catch(() => {}) // Ignore warmup errors
        );
      }
      
      await Promise.all(promises.splice(0, 5));
      await this.sleep(100);
    }

    logger.debug('Warmup phase completed');
  }

  private async runLoadTest(
    testFn: (context: TestContext) => Promise<void>,
    context: TestContext,
    config: PerformanceTestConfig
  ): Promise<{
    responseTimes: number[];
    errors: Array<{ timestamp: number; error: Error }>;
    timeline: Array<{ timestamp: number; responseTime?: number; error?: boolean }>;
  }> {
    const responseTimes: number[] = [];
    const errors: Array<{ timestamp: number; error: Error }> = [];
    const timeline: Array<{ timestamp: number; responseTime?: number; error?: boolean }> = [];

    const testStartTime = Date.now();
    const testEndTime = testStartTime + config.duration;
    const rampUpEndTime = testStartTime + config.rampUpTime;
    const rampDownStartTime = testEndTime - config.rampDownTime;

    let activePromises = 0;
    const maxConcurrency = config.concurrency;

    const executeRequest = async (): Promise<void> => {
      activePromises++;
      const requestStartTime = Date.now();

      try {
        await testFn(context);
        const responseTime = Date.now() - requestStartTime;
        responseTimes.push(responseTime);
        timeline.push({ timestamp: requestStartTime, responseTime });
      } catch (error) {
        const responseTime = Date.now() - requestStartTime;
        errors.push({ timestamp: requestStartTime, error: error as Error });
        timeline.push({ timestamp: requestStartTime, error: true });
      } finally {
        activePromises--;
      }
    };

    while (Date.now() < testEndTime) {
      const now = Date.now();
      let targetConcurrency = maxConcurrency;

      // Ramp up phase
      if (now < rampUpEndTime) {
        const rampUpProgress = (now - testStartTime) / config.rampUpTime;
        targetConcurrency = Math.ceil(maxConcurrency * rampUpProgress);
      }

      // Ramp down phase
      if (now > rampDownStartTime) {
        const rampDownProgress = (testEndTime - now) / config.rampDownTime;
        targetConcurrency = Math.ceil(maxConcurrency * rampDownProgress);
      }

      // Start new requests if under target concurrency
      while (activePromises < targetConcurrency) {
        executeRequest().catch(() => {}); // Errors are handled in executeRequest
      }

      await this.sleep(10); // Small delay to prevent busy waiting
    }

    // Wait for remaining requests to complete
    while (activePromises > 0) {
      await this.sleep(100);
    }

    return { responseTimes, errors, timeline };
  }

  private calculateMetrics(
    responseTimes: number[],
    errors: Array<{ timestamp: number; error: Error }>,
    duration: number,
    startMemory: number,
    endMemory: number,
    peakMemory: number
  ): PerformanceMetrics {
    const totalRequests = responseTimes.length + errors.length;
    const successfulRequests = responseTimes.length;
    const failedRequests = errors.length;

    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    const sum = responseTimes.reduce((a, b) => a + b, 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalDuration: duration,
      averageResponseTime: responseTimes.length > 0 ? sum / responseTimes.length : 0,
      minResponseTime: sortedResponseTimes[0] || 0,
      maxResponseTime: sortedResponseTimes[sortedResponseTimes.length - 1] || 0,
      p50ResponseTime: this.calculatePercentile(sortedResponseTimes, 50),
      p90ResponseTime: this.calculatePercentile(sortedResponseTimes, 90),
      p95ResponseTime: this.calculatePercentile(sortedResponseTimes, 95),
      p99ResponseTime: this.calculatePercentile(sortedResponseTimes, 99),
      throughput: totalRequests / (duration / 1000), // requests per second
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
      responseTimes: sortedResponseTimes,
      errors,
      memoryUsage: {
        start: startMemory,
        end: endMemory,
        peak: peakMemory,
        delta: endMemory - startMemory
      }
    };
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] ?? 0;
  }

  private getPerformanceAssertions(config: PerformanceTestConfig): PerformanceAssertion[] {
    return [
      {
        name: 'Average Response Time',
        assertion: (metrics) => metrics.averageResponseTime <= config.maxResponseTime,
        message: `Average response time should be <= ${config.maxResponseTime}ms`
      },
      {
        name: 'P95 Response Time',
        assertion: (metrics) => metrics.p95ResponseTime <= config.maxResponseTime * 2,
        message: `P95 response time should be <= ${config.maxResponseTime * 2}ms`
      },
      {
        name: 'Error Rate',
        assertion: (metrics) => metrics.errorRate <= config.errorThreshold,
        message: `Error rate should be <= ${config.errorThreshold}%`
      },
      {
        name: 'Throughput',
        assertion: (metrics) => metrics.throughput >= config.minThroughput,
        message: `Throughput should be >= ${config.minThroughput} RPS`
      },
      {
        name: 'Memory Usage',
        assertion: (metrics) => {
          if (!metrics.memoryUsage) return true;
          const memoryIncreaseMB = metrics.memoryUsage.delta / (1024 * 1024);
          return memoryIncreaseMB < 100; // Less than 100MB increase
        },
        message: 'Memory usage increase should be < 100MB'
      }
    ];
  }

  private validateAssertions(
    metrics: PerformanceMetrics,
    assertions: PerformanceAssertion[]
  ): string[] {
    const failures: string[] = [];

    for (const assertion of assertions) {
      if (!assertion.assertion(metrics)) {
        failures.push(`${assertion.name}: ${assertion.message}`);
      }
    }

    return failures;
  }

  private generateRecommendations(
    metrics: PerformanceMetrics,
    config: PerformanceTestConfig
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (metrics.averageResponseTime > config.maxResponseTime * 0.8) {
      recommendations.push('Consider optimizing response time - average is approaching threshold');
    }

    if (metrics.p95ResponseTime > metrics.averageResponseTime * 3) {
      recommendations.push('High P95 response time indicates inconsistent performance - investigate outliers');
    }

    // Throughput recommendations
    if (metrics.throughput < config.minThroughput * 1.5) {
      recommendations.push('Low throughput - consider scaling or optimizing bottlenecks');
    }

    // Error rate recommendations
    if (metrics.errorRate > config.errorThreshold * 0.5) {
      recommendations.push('Error rate is elevated - investigate common failure patterns');
    }

    // Memory recommendations
    if (metrics.memoryUsage && metrics.memoryUsage.delta > 50 * 1024 * 1024) {
      recommendations.push('Memory usage increased significantly - check for memory leaks');
    }

    return recommendations;
  }

  private generateChartsData(
    timeline: Array<{ timestamp: number; responseTime?: number; error?: boolean }>,
    config: PerformanceTestConfig
  ) {
    // Create time buckets (10 second intervals)
    const bucketSize = 10000; // 10 seconds
    const buckets = new Map<number, { responseTimes: number[]; errors: number; count: number }>();

    for (const entry of timeline) {
      const bucketTime = Math.floor(entry.timestamp / bucketSize) * bucketSize;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { responseTimes: [], errors: 0, count: 0 });
      }

      const bucket = buckets.get(bucketTime)!;
      bucket.count++;

      if (entry.error) {
        bucket.errors++;
      } else if (entry.responseTime) {
        bucket.responseTimes.push(entry.responseTime);
      }
    }

    const responseTimeOverTime = Array.from(buckets.entries()).map(([timestamp, bucket]) => ({
      timestamp,
      value: bucket.responseTimes.length > 0 
        ? bucket.responseTimes.reduce((a, b) => a + b, 0) / bucket.responseTimes.length 
        : 0
    }));

    const throughputOverTime = Array.from(buckets.entries()).map(([timestamp, bucket]) => ({
      timestamp,
      value: bucket.count / (bucketSize / 1000) // requests per second
    }));

    const errorRateOverTime = Array.from(buckets.entries()).map(([timestamp, bucket]) => ({
      timestamp,
      value: bucket.count > 0 ? (bucket.errors / bucket.count) * 100 : 0
    }));

    return {
      responseTimeOverTime,
      throughputOverTime,
      errorRateOverTime
    };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================
// Load Testing Utilities
// =====================================

export class LoadTestingUtils {
  static createRampUpProfile(
    minConcurrency: number,
    maxConcurrency: number,
    steps: number
  ): number[] {
    const profile: number[] = [];
    const increment = (maxConcurrency - minConcurrency) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      profile.push(Math.ceil(minConcurrency + (increment * i)));
    }

    return profile;
  }

  static createSpikeTestProfile(
    baseConcurrency: number,
    spikeConcurrency: number,
    spikeDuration: number,
    totalDuration: number
  ): Array<{ timestamp: number; concurrency: number }> {
    const profile: Array<{ timestamp: number; concurrency: number }> = [];
    const spikeStart = totalDuration * 0.5; // Spike at 50% of test duration
    const spikeEnd = spikeStart + spikeDuration;

    for (let t = 0; t <= totalDuration; t += 1000) { // 1 second intervals
      let concurrency = baseConcurrency;
      
      if (t >= spikeStart && t <= spikeEnd) {
        concurrency = spikeConcurrency;
      }

      profile.push({ timestamp: t, concurrency });
    }

    return profile;
  }

  static createStressTestConfig(baseConfig: PerformanceTestConfig): PerformanceTestConfig {
    return {
      ...baseConfig,
      concurrency: baseConfig.concurrency * 3,
      duration: baseConfig.duration * 2,
      maxResponseTime: baseConfig.maxResponseTime * 2,
      errorThreshold: baseConfig.errorThreshold * 2
    };
  }

  static async runConcurrencyTest(
    testFn: (context: TestContext) => Promise<void>,
    context: TestContext,
    concurrencyLevels: number[],
    durationPerLevel: number = 30000
  ): Promise<Map<number, LoadTestResult>> {
    const runner = new PerformanceTestRunner();
    const results = new Map<number, LoadTestResult>();

    for (const concurrency of concurrencyLevels) {
      logger.info(`Running concurrency test with ${concurrency} concurrent users`);

      const config: PerformanceTestConfig = {
        duration: durationPerLevel,
        concurrency,
        warmupTime: 5000,
        cooldownTime: 2000,
        maxResponseTime: 5000,
        minThroughput: 1,
        errorThreshold: 5,
        rampUpTime: 5000,
        rampDownTime: 2000
      };

      const result = await runner.runPerformanceTest(
        `Concurrency-${concurrency}`,
        testFn,
        context,
        config
      );

      results.set(concurrency, result);

      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  static generatePerformanceReport(results: Map<number, LoadTestResult>): string {
    let report = '# Performance Test Report\n\n';

    for (const [concurrency, result] of results.entries()) {
      report += `## Concurrency Level: ${concurrency}\n`;
      report += `- **Success**: ${result.success ? '✅' : '❌'}\n`;
      report += `- **Throughput**: ${result.metrics.throughput.toFixed(2)} RPS\n`;
      report += `- **Avg Response Time**: ${result.metrics.averageResponseTime.toFixed(2)}ms\n`;
      report += `- **P95 Response Time**: ${result.metrics.p95ResponseTime.toFixed(2)}ms\n`;
      report += `- **Error Rate**: ${result.metrics.errorRate.toFixed(2)}%\n`;
      report += `- **Total Requests**: ${result.metrics.totalRequests}\n`;

      if (result.failures.length > 0) {
        report += `\n**Failures:**\n`;
        for (const failure of result.failures) {
          report += `- ${failure}\n`;
        }
      }

      if (result.recommendations.length > 0) {
        report += `\n**Recommendations:**\n`;
        for (const recommendation of result.recommendations) {
          report += `- ${recommendation}\n`;
        }
      }

      report += '\n---\n\n';
    }

    return report;
  }
}

// =====================================
// Performance Assertions
// =====================================

export class PerformanceAssert {
  static responseTimeUnder(metrics: PerformanceMetrics, maxMs: number): void {
    Assert.true(
      metrics.averageResponseTime <= maxMs,
      `Average response time ${metrics.averageResponseTime}ms should be under ${maxMs}ms`
    );
  }

  static throughputAbove(metrics: PerformanceMetrics, minRps: number): void {
    Assert.true(
      metrics.throughput >= minRps,
      `Throughput ${metrics.throughput.toFixed(2)} RPS should be above ${minRps} RPS`
    );
  }

  static errorRateUnder(metrics: PerformanceMetrics, maxPercent: number): void {
    Assert.true(
      metrics.errorRate <= maxPercent,
      `Error rate ${metrics.errorRate.toFixed(2)}% should be under ${maxPercent}%`
    );
  }

  static p95ResponseTimeUnder(metrics: PerformanceMetrics, maxMs: number): void {
    Assert.true(
      metrics.p95ResponseTime <= maxMs,
      `P95 response time ${metrics.p95ResponseTime}ms should be under ${maxMs}ms`
    );
  }

  static memoryUsageStable(metrics: PerformanceMetrics, maxIncreaseMB: number = 50): void {
    if (metrics.memoryUsage) {
      const increaseMB = metrics.memoryUsage.delta / (1024 * 1024);
      Assert.true(
        increaseMB <= maxIncreaseMB,
        `Memory usage increased by ${increaseMB.toFixed(2)}MB, should be under ${maxIncreaseMB}MB`
      );
    }
  }
}

// Export main utilities
export const performanceTestSuite = {
  PerformanceTestRunner,
  LoadTestingUtils,
  PerformanceAssert,
  
  // Convenience functions
  runPerformanceTest: async (
    name: string,
    testFn: (context: TestContext) => Promise<void>,
    context: TestContext,
    config?: Partial<PerformanceTestConfig>
  ) => {
    const runner = new PerformanceTestRunner();
    return runner.runPerformanceTest(name, testFn, context, config);
  },
  
  runConcurrencyTest: LoadTestingUtils.runConcurrencyTest,
  generateReport: LoadTestingUtils.generatePerformanceReport
};