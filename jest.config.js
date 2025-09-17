/** @type {import('jest').Config} */
const config = {
  // Multi-project configuration
  projects: [
    '<rootDir>/packages/api/jest.config.js',
    '<rootDir>/packages/shared/jest.config.js', 
    '<rootDir>/packages/ui/jest.config.js',
    '<rootDir>/apps/web/jest.config.js'
  ],
  // Global runner settings only
  maxWorkers: '50%'
};

module.exports = config;