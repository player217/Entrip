import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        resolveJsonModule: true
      }
    }]
  },
  moduleNameMapper: {
    '^@entrip/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@entrip/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@entrip/ui$': '<rootDir>/packages/ui/src/index.ts',
    '^@entrip/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '^@entrip/design-tokens$': '<rootDir>/packages/design-tokens/dist/index.js',
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.svg$': '<rootDir>/test/mocks/svg.js'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/.next/**',
    '!**/generated/**'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40
    }
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@tanstack|@radix-ui|cmdk|tailwind-merge|clsx|class-variance-authority)/)'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  maxWorkers: '50%'
};

export default config;