const baseConfig = require('../../jest.base.config');

module.exports = {
  ...baseConfig,
  displayName: '@entrip/shared',
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/__tests__/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testPathIgnorePatterns: ['<rootDir>/dist'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/mocks/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        verbatimModuleSyntax: false,
        esModuleInterop: true,
      },
    }],
  },
};