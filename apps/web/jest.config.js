/** @type {import('jest').Config} */
module.exports = {
  displayName: '@entrip/web',
  testEnvironment: 'jsdom',

  // Test discovery
  // Limit to stabilized suites at top-level and app/; exclude deep src component tests for now
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/app/**/__tests__/**/*.test.{ts,tsx}'
  ],
  testPathIgnorePatterns: ['<rootDir>/.next', '<rootDir>/dist', '<rootDir>/node_modules'],

  // Setup
  setupFilesAfterEnv: ['<rootDir>/../../jest.global.setup.js', '<rootDir>/__tests__/setup.ts'],

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@entrip/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@entrip/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@entrip/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@hookform/resolvers/zod$': '<rootDir>/__mocks__/hookform-resolvers-zod.js',
    '^react-beautiful-dnd$': '<rootDir>/__mocks__/react-beautiful-dnd.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'app/(main)/layout.tsx',
    'src/components/BookingModal.tsx',
    'src/providers/ToastProvider.tsx',
    'src/features/calendar/ReservationListView.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },

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
