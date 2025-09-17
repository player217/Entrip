/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/ui',
  testEnvironment: 'jsdom',
  testTimeout: 60000,
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Test discovery  
  testPathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/node_modules'],
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  
  // React/TypeScript transformation - modern config
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        verbatimModuleSyntax: false,
      },
    }],
  },
};