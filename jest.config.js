/** @type {import('jest').Config} */
const config = {
  testTimeout: 60000, // 60 seconds
  verbose: true,
  projects: [
    '<rootDir>/packages/api/jest.config.js',
    '<rootDir>/packages/shared/jest.config.js', 
    '<rootDir>/packages/ui/jest.config.js',
    '<rootDir>/apps/web/jest.config.js'
  ]
};

module.exports = config;