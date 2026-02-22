/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/shared',
  testEnvironment: 'jsdom',
  fakeTimers: { enableGlobally: true },

  // Test discovery
  testMatch: ['<rootDir>/src/**/__tests__/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/dist'],

  // Setup
  setupFilesAfterEnv: ['<rootDir>/../../jest.global.setup.js', '<rootDir>/jest.setup.ts'],

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/mocks/**',
  ],

  // TypeScript transformation - modern config
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        verbatimModuleSyntax: false,
        esModuleInterop: true,
      },
    }],
  },
};
