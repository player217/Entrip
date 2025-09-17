/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/api',
  testEnvironment: 'node',
  testTimeout: 60000,
  rootDir: '.',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Test discovery
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/dist'],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Coverage configuration
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // TypeScript transformation - modern config
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        verbatimModuleSyntax: false,
      },
    }],
  },
};