/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/packages/api',
    '<rootDir>/packages/shared',
    '<rootDir>/packages/ui',
    '<rootDir>/apps/web'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'json-summary', 'lcov', 'html'],
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'apps/web/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/dist/**',
    '!**/build/**',
    '!**/.next/**',
    '!**/coverage/**'
  ]
};