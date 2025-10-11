/** @type {import('jest').Config} */
const config = {
  // Multi-project configuration
  // Host 실행 기본값: @entrip/shared 우선(데이터베이스 의존 제거)
  // v2 테스트는 컨테이너 내부에서 실행하는 스크립트 제공
  // Stabilized projects (Shared, API, UI, Web)
  projects: [
    '<rootDir>/packages/shared/jest.config.js',
    '<rootDir>/packages/api/jest.config.js',
    '<rootDir>/packages/ui/jest.config.js',
    '<rootDir>/apps/web/jest.config.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'apps/web/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/dist/**',
    '!**/build/**',
    '!coverage/**'
  ],
  // Global runner settings only
  maxWorkers: '50%'
};

module.exports = config;
