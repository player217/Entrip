/**
 * Testing Framework - Centralized exports
 * Complete testing solution with integration, performance, and load testing
 */

// Import for internal use
import { 
  TestUtils as TestUtilsInternal,
  testFramework as testFrameworkInternal,
  Assert as AssertInternal
} from './IntegrationTestFramework';
import { 
  performanceTestSuite as performanceTestSuiteInternal,
  PerformanceAssert as PerformanceAssertInternal
} from './PerformanceTestSuite';

// Integration Testing
export {
  TestRunner,
  Assert,
  TestUtils,
  testFramework,
  type TestConfig,
  type TestContext,
  type TestResult,
  type TestSuite,
  type TestCase,
  type AssertionError
} from './IntegrationTestFramework';

// Performance Testing
export {
  PerformanceTestRunner,
  LoadTestingUtils,
  PerformanceAssert,
  performanceTestSuite,
  type PerformanceTestConfig,
  type PerformanceMetrics,
  type LoadTestResult,
  type PerformanceAssertion
} from './PerformanceTestSuite';

// Testing utilities and presets
export const TestingPresets = {
  // Unit test configuration
  UNIT: {
    timeout: 5000,
    retries: 0,
    parallel: true,
    verbose: false,
    mockMode: true,
    environment: 'test' as const
  },

  // Integration test configuration
  INTEGRATION: {
    timeout: 30000,
    retries: 2,
    parallel: false,
    verbose: true,
    mockMode: false,
    environment: 'test' as const
  },

  // End-to-end test configuration
  E2E: {
    timeout: 60000,
    retries: 3,
    parallel: false,
    verbose: true,
    skipCleanup: false,
    mockMode: false,
    environment: 'staging' as const
  },

  // Performance test configuration
  PERFORMANCE: {
    duration: 60000, // 1 minute
    concurrency: 10,
    warmupTime: 5000,
    cooldownTime: 5000,
    maxResponseTime: 2000,
    minThroughput: 5,
    errorThreshold: 2,
    rampUpTime: 10000,
    rampDownTime: 5000
  },

  // Load test configuration
  LOAD: {
    duration: 300000, // 5 minutes
    concurrency: 50,
    warmupTime: 30000,
    cooldownTime: 10000,
    maxResponseTime: 5000,
    minThroughput: 20,
    errorThreshold: 5,
    rampUpTime: 60000,
    rampDownTime: 30000
  },

  // Stress test configuration
  STRESS: {
    duration: 600000, // 10 minutes
    concurrency: 200,
    warmupTime: 60000,
    cooldownTime: 30000,
    maxResponseTime: 10000,
    minThroughput: 10,
    errorThreshold: 10,
    rampUpTime: 120000,
    rampDownTime: 60000
  }
};

// Common test data generators
export const TestDataGenerators = {
  user: () => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Date.now()}@example.com`,
    name: `Test User ${Date.now()}`,
    role: 'USER',
    companyCode: 'TEST'
  }),

  booking: () => ({
    id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bookingNumber: `BK${Date.now()}`,
    customerName: `Customer ${Date.now()}`,
    teamName: `Team ${Date.now()}`,
    destination: 'Test Destination',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'CONFIRMED' as const,
    totalPrice: Math.floor(Math.random() * 1000000) + 100000, // 100K - 1.1M
    paxCount: Math.floor(Math.random() * 10) + 1,
    companyCode: 'TEST',
    version: 1
  }),

  company: () => ({
    code: `C${Date.now()}`,
    name: `Test Company ${Date.now()}`,
    type: 'CORPORATE' as const
  }),

  // Generate array of test data
  users: (count: number) => Array.from({ length: count }, () => TestDataGenerators.user()),
  bookings: (count: number) => Array.from({ length: count }, () => TestDataGenerators.booking()),
  companies: (count: number) => Array.from({ length: count }, () => TestDataGenerators.company())
};

// Common test utilities
export const TestingUtils = {
  // Create test suite with common setup
  createApiTestSuite: (name: string, baseUrl: string = 'http://localhost:4001') => ({
    name,
    config: { ...TestingPresets.INTEGRATION, baseUrl },
    setup: async (context: any) => {
      context.state.apiUrl = baseUrl;
      context.state.testData = {
        user: TestDataGenerators.user(),
        booking: TestDataGenerators.booking(),
        company: TestDataGenerators.company()
      };
    },
    teardown: async (context: any) => {
      // Cleanup test data if needed
    },
    tests: [] as any[]
  }),

  // Create performance test with common configuration
  createPerformanceTest: (
    name: string,
    testFn: (context: any) => Promise<void>,
    preset: keyof typeof TestingPresets = 'PERFORMANCE'
  ) => ({
    name,
    testFn,
    config: TestingPresets[preset]
  }),

  // Wait for condition with timeout
  waitForCondition: TestUtilsInternal.waitFor,

  // Retry operation
  retryOperation: TestUtilsInternal.retry,

  // Mock responses
  mockResponse: TestUtilsInternal.mockResponse,

  // Sleep utility
  sleep: TestUtilsInternal.sleep
};

// Setup function for testing environment
export function setupTesting(options: {
  environment?: 'unit' | 'integration' | 'e2e';
  enablePerformanceTests?: boolean;
  enableVerboseLogging?: boolean;
  baseUrl?: string;
} = {}): void {
  const {
    environment = 'integration',
    enablePerformanceTests = false,
    enableVerboseLogging = false,
    baseUrl = 'http://localhost:4001'
  } = options;

  // Configure global test settings
  const config = TestingPresets[environment.toUpperCase() as keyof typeof TestingPresets];
  
  if (enableVerboseLogging && typeof config === 'object') {
    (config as any).verbose = true;
  }

  // Set global test configuration
  if (typeof window !== 'undefined') {
    (window as any).__TEST_CONFIG__ = {
      ...config,
      baseUrl,
      enablePerformanceTests
    };
  }

  console.log(`🧪 Testing framework configured for ${environment} environment`);
  if (enablePerformanceTests) {
    console.log('📊 Performance testing enabled');
  }
}

// Export convenience functions
export const testing = {
  // Framework functions
  runSuite: testFrameworkInternal.runSuite,
  createTest: testFrameworkInternal.createTest,
  createSuite: testFrameworkInternal.createSuite,

  // Performance testing
  runPerformanceTest: performanceTestSuiteInternal.runPerformanceTest,
  runConcurrencyTest: performanceTestSuiteInternal.runConcurrencyTest,
  generateReport: performanceTestSuiteInternal.generateReport,

  // Assertions
  assert: AssertInternal,
  performanceAssert: PerformanceAssertInternal,

  // Utilities
  utils: TestingUtils,
  data: TestDataGenerators,
  presets: TestingPresets,

  // Setup
  setup: setupTesting
};

// Quick test creation helpers
export function createQuickTest(name: string, testFn: (context: any) => Promise<void>) {
  return testFrameworkInternal.createTest(name, testFn);
}

export function createQuickSuite(name: string, tests: any[]) {
  return testFrameworkInternal.createSuite(name, tests);
}

export async function runQuickTest(
  name: string,
  testFn: (context: any) => Promise<void>,
  config?: any
) {
  const suite = createQuickSuite(name, [createQuickTest(name, testFn)]);
  return testFrameworkInternal.runSuite(suite, config);
}