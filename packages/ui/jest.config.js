const baseConfig = require('../../jest.base.config');

module.exports = {
  ...baseConfig,
  displayName: '@entrip/ui',
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/node_modules'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
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