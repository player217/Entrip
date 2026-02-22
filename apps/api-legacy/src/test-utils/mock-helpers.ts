import { jest } from '@jest/globals';

/**
 * Type-safe mock helper that preserves function signatures
 * @param fn - The function to mock
 * @returns A properly typed Jest mock function
 */
export function asMock<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
  return fn as jest.MockedFunction<T>;
}

/**
 * Create a typed mock function with explicit return and parameter types
 * @returns A typed Jest mock function
 */
export function createMock<TFunc extends (...args: any[]) => any = () => any>(): jest.Mock<TFunc> {
  return jest.fn<TFunc>();
}

/**
 * Type helper for mocking async functions
 */
export function createAsyncMock<TReturn = any>(): jest.Mock<(...args: any[]) => Promise<TReturn>> {
  return jest.fn<(...args: any[]) => Promise<TReturn>>();
}

/**
 * Helper to create a mocked object with all methods properly typed
 */
export function mockObject<T extends Record<string, any>>(obj: T): jest.Mocked<T> {
  const mocked = {} as jest.Mocked<T>;
  
  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      (mocked as any)[key] = jest.fn();
    } else {
      (mocked as any)[key] = obj[key];
    }
  }
  
  return mocked;
}

/**
 * Type guard to check if a value is a mock function
 */
export function isMockFunction(fn: any): fn is jest.Mock {
  return fn && typeof fn === 'function' && 'mock' in fn;
}