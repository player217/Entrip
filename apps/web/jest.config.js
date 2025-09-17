/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/web',
  testEnvironment: 'jsdom',
  testTimeout: 60000,
  
  // Test discovery
  testMatch: ['<rootDir>/**/__tests__/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/.next', '<rootDir>/dist', '<rootDir>/node_modules'],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@entrip/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@entrip/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  
  // React/Next.js transformation - modern config
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        verbatimModuleSyntax: false,
      },
    }],
  },
};