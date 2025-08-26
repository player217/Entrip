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
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        verbatimModuleSyntax: false,
      },
    },
  },
};