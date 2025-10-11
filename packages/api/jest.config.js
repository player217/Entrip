/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/api',
  testEnvironment: 'node',
  rootDir: '.',
  // Stabilize API tests under CI load

  // Setup files
  setupFiles: ['<rootDir>/src/test/env-setup.js'],
  setupFilesAfterEnv: ['<rootDir>/../../jest.global.setup.js', '<rootDir>/src/test/setup.ts'],

  // Test discovery
  // Limit to top-level v2 contract/unit tests during migration
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
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
  coverageThreshold: {
    global: {
      // Keep coverage gating light while routes are being migrated
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // TypeScript transformation - modern config
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        verbatimModuleSyntax: false,
        skipLibCheck: true,
        types: ['node', 'jest'],
        moduleResolution: 'node',
      },
    }],
  },
};
