// Mock zustand persist middleware for tests
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => (set: any, get: any, api: any) => {
      // Return the config function without persistence
      return config(set, get, api);
    },
  };
});

// Don't mock logger globally - let individual tests handle it

// Set global test timeout to prevent hanging
jest.setTimeout(30000); // 30 seconds

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Ensure all timers are cleared after tests
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});