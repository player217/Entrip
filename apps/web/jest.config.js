const baseConfig = require('../../jest.base.config');

module.exports = {
  ...baseConfig,
  displayName: '@entrip/web',
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/**/__tests__/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/.next', '<rootDir>/dist', '<rootDir>/node_modules'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@entrip/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@entrip/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        verbatimModuleSyntax: false,
      },
    }],
  },
};