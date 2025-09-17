/**
 * Integration Test Framework
 * Comprehensive testing utilities for API client and system integration testing
 */

import { ApiError } from '../error-handling/ApiError';
import { logger } from '../monitoring/StructuredLogger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

// =====================================
// Test Configuration and Types
// =====================================

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  verbose: boolean;
  skipCleanup: boolean;
  mockMode: boolean;
  environment: 'test' | 'staging' | 'production';
}

export interface TestContext {
  config: TestConfig;
  state: Record<string, any>;
  cleanup: Array<() => Promise<void>>;
  metadata: {
    startTime: number;
    testId: string;
    suiteName: string;
  };
}

export interface TestResult {
  success: boolean;
  duration: number;
  error?: Error;
  logs: string[];
  metrics?: Record<string, number>;
  artifacts?: Record<string, any>;
}

export interface TestSuite {
  name: string;
  setup?: (context: TestContext) => Promise<void>;
  teardown?: (context: TestContext) => Promise<void>;
  tests: TestCase[];
  config?: Partial<TestConfig>;
}

export interface TestCase {
  name: string;
  description?: string;
  tags?: string[];
  skip?: boolean;
  timeout?: number;
  retries?: number;
  depends?: string[];
  setup?: (context: TestContext) => Promise<void>;
  teardown?: (context: TestContext) => Promise<void>;
  test: (context: TestContext) => Promise<void>;
}

export interface AssertionError extends Error {
  actual: any;
  expected: any;
  operator: string;
}

// =====================================
// Test Runner
// =====================================

export class TestRunner {
  private config: TestConfig;
  private results: Map<string, TestResult> = new Map();
  private globalContext: Partial<TestContext> = {};

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:4001',
      timeout: 30000,
      retries: 2,
      parallel: false,
      verbose: true,
      skipCleanup: false,
      mockMode: false,
      environment: 'test',
      ...config
    };
  }

  async runSuite(suite: TestSuite): Promise<Map<string, TestResult>> {
    const suiteConfig = { ...this.config, ...suite.config };
    this.results.clear();

    logger.info(`Starting test suite: ${suite.name}`, {
      testCount: suite.tests.length,
      config: suiteConfig,
      operation: 'test_suite_start'
    }, ['test', 'suite', 'start']);

    const suiteStartTime = Date.now();

    try {
      // Create suite context
      const context = this.createContext(suite.name, suiteConfig);

      // Run suite setup
      if (suite.setup) {
        await this.runWithTimeout('Suite Setup', suite.setup, context, suiteConfig.timeout);
      }

      // Filter and sort tests
      const testsToRun = this.prepareTests(suite.tests);

      // Run tests
      if (suiteConfig.parallel) {
        await this.runTestsParallel(testsToRun, context);
      } else {
        await this.runTestsSequential(testsToRun, context);
      }

      // Run suite teardown
      if (suite.teardown && !suiteConfig.skipCleanup) {
        await this.runWithTimeout('Suite Teardown', suite.teardown, context, suiteConfig.timeout);
      }

      // Run cleanup
      await this.runCleanup(context);

    } catch (error) {
      logger.error(`Test suite failed: ${suite.name}`, error as Error, {
        operation: 'test_suite_error'
      }, ['test', 'suite', 'error']);
    }

    const suiteDuration = Date.now() - suiteStartTime;
    this.logSummary(suite.name, suiteDuration);

    return new Map(this.results);
  }

  async runTest(testCase: TestCase, context: TestContext): Promise<TestResult> {
    const testStartTime = Date.now();
    const logs: string[] = [];
    let error: Error | undefined;
    let success = false;

    logger.info(`Running test: ${testCase.name}`, {
      description: testCase.description,
      tags: testCase.tags,
      operation: 'test_start'
    }, ['test', 'case', 'start']);

    try {
      // Test setup
      if (testCase.setup) {
        await this.runWithTimeout(
          `${testCase.name} Setup`,
          testCase.setup,
          context,
          testCase.timeout || context.config.timeout
        );
      }

      // Run actual test with retries
      await this.runWithRetries(
        testCase.name,
        testCase.test,
        context,
        testCase.retries || context.config.retries,
        testCase.timeout || context.config.timeout
      );

      success = true;

    } catch (err) {
      error = err as Error;
      logs.push(`Test failed: ${error.message}`);

      logger.error(`Test failed: ${testCase.name}`, error, {
        operation: 'test_failure'
      }, ['test', 'case', 'failure']);

    } finally {
      // Test teardown
      if (testCase.teardown && !context.config.skipCleanup) {
        try {
          await this.runWithTimeout(
            `${testCase.name} Teardown`,
            testCase.teardown,
            context,
            testCase.timeout || context.config.timeout
          );
        } catch (teardownError) {
          logs.push(`Teardown failed: ${(teardownError as Error).message}`);
        }
      }
    }

    const duration = Date.now() - testStartTime;
    const result: TestResult = {
      success,
      duration,
      error,
      logs
    };

    this.results.set(testCase.name, result);

    logger.info(`Test completed: ${testCase.name}`, {
      success,
      duration,
      operation: 'test_complete'
    }, ['test', 'case', success ? 'success' : 'failure']);

    return result;
  }

  private createContext(suiteName: string, config: TestConfig): TestContext {
    return {
      config,
      state: { ...this.globalContext },
      cleanup: [],
      metadata: {
        startTime: Date.now(),
        testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        suiteName
      }
    };
  }

  private prepareTests(tests: TestCase[]): TestCase[] {
    // Filter out skipped tests
    const activeTests = tests.filter(test => !test.skip);

    // Sort by dependencies (simple topological sort)
    const sorted: TestCase[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (test: TestCase) => {
      if (visited.has(test.name)) return;
      if (visiting.has(test.name)) {
        throw new Error(`Circular dependency detected involving test: ${test.name}`);
      }

      visiting.add(test.name);

      if (test.depends) {
        for (const dep of test.depends) {
          const depTest = activeTests.find(t => t.name === dep);
          if (depTest) {
            visit(depTest);
          }
        }
      }

      visiting.delete(test.name);
      visited.add(test.name);
      sorted.push(test);
    };

    for (const test of activeTests) {
      visit(test);
    }

    return sorted;
  }

  private async runTestsSequential(tests: TestCase[], context: TestContext): Promise<void> {
    for (const test of tests) {
      await this.runTest(test, context);
    }
  }

  private async runTestsParallel(tests: TestCase[], context: TestContext): Promise<void> {
    const promises = tests.map(test => this.runTest(test, context));
    await Promise.allSettled(promises);
  }

  private async runWithTimeout<T>(
    name: string,
    fn: (context: TestContext) => Promise<T>,
    context: TestContext,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${name} timed out after ${timeout}ms`));
      }, timeout);

      fn(context)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async runWithRetries<T>(
    name: string,
    fn: (context: TestContext) => Promise<T>,
    context: TestContext,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await this.runWithTimeout(name, fn, context, timeout);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= retries) {
          logger.warn(`Test attempt ${attempt} failed, retrying: ${name}`, {
            error: lastError.message,
            attempt,
            maxAttempts: retries + 1,
            operation: 'test_retry'
          }, ['test', 'retry']);
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    throw lastError!;
  }

  private async runCleanup(context: TestContext): Promise<void> {
    if (context.config.skipCleanup) return;

    for (const cleanupFn of context.cleanup.reverse()) {
      try {
        await cleanupFn();
      } catch (error) {
        logger.warn('Cleanup function failed', { error }, ['test', 'cleanup', 'warning']);
      }
    }
  }

  private logSummary(suiteName: string, duration: number): void {
    const total = this.results.size;
    const passed = Array.from(this.results.values()).filter(r => r.success).length;
    const failed = total - passed;
    const avgDuration = total > 0 
      ? Array.from(this.results.values()).reduce((sum, r) => sum + r.duration, 0) / total 
      : 0;

    logger.info(`Test suite completed: ${suiteName}`, {
      total,
      passed,
      failed,
      duration,
      avgDuration: Math.round(avgDuration),
      operation: 'test_suite_complete'
    }, ['test', 'suite', 'complete']);

    if (this.config.verbose) {
      console.log(`\n📊 Test Summary for ${suiteName}:`);
      console.log(`   Total: ${total}`);
      console.log(`   Passed: ${passed}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Average: ${Math.round(avgDuration)}ms per test\n`);
    }
  }

  getResults(): Map<string, TestResult> {
    return new Map(this.results);
  }

  setGlobalContext(context: Record<string, any>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }
}

// =====================================
// Assertion Library
// =====================================

export class Assert {
  static equals<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw this.createAssertionError(actual, expected, '===', message);
    }
  }

  static notEquals<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw this.createAssertionError(actual, expected, '!==', message);
    }
  }

  static deepEquals(actual: any, expected: any, message?: string): void {
    if (!this.deepEqual(actual, expected)) {
      throw this.createAssertionError(actual, expected, 'deepEquals', message);
    }
  }

  static true(value: any, message?: string): void {
    if (value !== true) {
      throw this.createAssertionError(value, true, '===', message);
    }
  }

  static false(value: any, message?: string): void {
    if (value !== false) {
      throw this.createAssertionError(value, false, '===', message);
    }
  }

  static truthy(value: any, message?: string): void {
    if (!value) {
      throw this.createAssertionError(value, 'truthy', 'toBeTruthy', message);
    }
  }

  static falsy(value: any, message?: string): void {
    if (value) {
      throw this.createAssertionError(value, 'falsy', 'toBeFalsy', message);
    }
  }

  static throws(fn: () => any, expected?: RegExp | string | Function, message?: string): void {
    let error: Error | undefined;
    
    try {
      fn();
    } catch (err) {
      error = err as Error;
    }

    if (!error) {
      throw this.createAssertionError('no error', 'error thrown', 'throws', message);
    }

    if (expected) {
      if (expected instanceof RegExp) {
        if (!expected.test(error.message)) {
          throw this.createAssertionError(error.message, expected.toString(), 'matches', message);
        }
      } else if (typeof expected === 'string') {
        if (!error.message.includes(expected)) {
          throw this.createAssertionError(error.message, expected, 'contains', message);
        }
      } else if (typeof expected === 'function') {
        if (!(error instanceof expected)) {
          throw this.createAssertionError(error.constructor.name, expected.name, 'instanceof', message);
        }
      }
    }
  }

  static async throwsAsync(
    fn: () => Promise<any>, 
    expected?: RegExp | string | Function, 
    message?: string
  ): Promise<void> {
    let error: Error | undefined;
    
    try {
      await fn();
    } catch (err) {
      error = err as Error;
    }

    if (!error) {
      throw this.createAssertionError('no error', 'error thrown', 'throws', message);
    }

    if (expected) {
      if (expected instanceof RegExp) {
        if (!expected.test(error.message)) {
          throw this.createAssertionError(error.message, expected.toString(), 'matches', message);
        }
      } else if (typeof expected === 'string') {
        if (!error.message.includes(expected)) {
          throw this.createAssertionError(error.message, expected, 'contains', message);
        }
      } else if (typeof expected === 'function') {
        if (!(error instanceof expected)) {
          throw this.createAssertionError(error.constructor.name, expected.name, 'instanceof', message);
        }
      }
    }
  }

  static arrayContains<T>(array: T[], item: T, message?: string): void {
    if (!Array.isArray(array)) {
      throw this.createAssertionError(typeof array, 'array', 'arrayContains', message);
    }
    
    if (!array.includes(item)) {
      throw this.createAssertionError(array, `array containing ${item}`, 'contains', message);
    }
  }

  static hasProperty(obj: any, property: string, message?: string): void {
    if (typeof obj !== 'object' || obj === null) {
      throw this.createAssertionError(typeof obj, 'object', 'hasProperty', message);
    }
    
    if (!(property in obj)) {
      throw this.createAssertionError(Object.keys(obj), `object with property "${property}"`, 'hasProperty', message);
    }
  }

  static matchesPattern(value: string, pattern: RegExp, message?: string): void {
    if (typeof value !== 'string') {
      throw this.createAssertionError(typeof value, 'string', 'matchesPattern', message);
    }
    
    if (!pattern.test(value)) {
      throw this.createAssertionError(value, pattern.toString(), 'matches', message);
    }
  }

  static greaterThan(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
      throw this.createAssertionError(actual, `> ${expected}`, '>', message);
    }
  }

  static lessThan(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
      throw this.createAssertionError(actual, `< ${expected}`, '<', message);
    }
  }

  static between(actual: number, min: number, max: number, message?: string): void {
    if (actual < min || actual > max) {
      throw this.createAssertionError(actual, `between ${min} and ${max}`, 'between', message);
    }
  }

  private static createAssertionError(actual: any, expected: any, operator: string, message?: string): AssertionError {
    const error = new Error(
      message || `Assertion failed: expected ${JSON.stringify(actual)} ${operator} ${JSON.stringify(expected)}`
    ) as AssertionError;
    
    error.name = 'AssertionError';
    error.actual = actual;
    error.expected = expected;
    error.operator = operator;
    
    return error;
  }

  private static deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a !== 'object') return a === b;
    
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
}

// =====================================
// Test Utilities
// =====================================

export class TestUtils {
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) return;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError!;
  }

  static mockResponse<T>(data: T, delay: number = 0): Promise<T> {
    return new Promise(resolve => {
      setTimeout(() => resolve(data), delay);
    });
  }

  static generateTestData(): {
    user: any;
    booking: any;
    company: any;
  } {
    const timestamp = Date.now();
    
    return {
      user: {
        id: `user_${timestamp}`,
        email: `test${timestamp}@example.com`,
        name: `Test User ${timestamp}`,
        role: 'USER'
      },
      booking: {
        id: `booking_${timestamp}`,
        bookingNumber: `BK${timestamp}`,
        customerName: `Customer ${timestamp}`,
        destination: 'Test Destination',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'CONFIRMED'
      },
      company: {
        code: `C${timestamp}`,
        name: `Test Company ${timestamp}`,
        type: 'CORPORATE'
      }
    };
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================
// Exports
// =====================================

export const testFramework = {
  TestRunner,
  Assert,
  TestUtils,
  
  // Convenience functions
  runSuite: (suite: TestSuite, config?: Partial<TestConfig>) => {
    const runner = new TestRunner(config);
    return runner.runSuite(suite);
  },
  
  createTest: (name: string, testFn: (context: TestContext) => Promise<void>): TestCase => ({
    name,
    test: testFn
  }),
  
  createSuite: (name: string, tests: TestCase[], options?: {
    setup?: (context: TestContext) => Promise<void>;
    teardown?: (context: TestContext) => Promise<void>;
    config?: Partial<TestConfig>;
  }): TestSuite => ({
    name,
    tests,
    setup: options?.setup,
    teardown: options?.teardown,
    config: options?.config
  })
};

// Types are already exported as interfaces above