// Ensure NODE_ENV is set before any modules import config
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}
// Provide a default, unique rate limit prefix to isolate tests
if (!process.env.RATE_LIMIT_PREFIX) {
  process.env.RATE_LIMIT_PREFIX = `jest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


const testUrl = process.env.TEST_DATABASE_URL || 'postgresql://entrip:entrip@localhost:5432/entrip_test';
if (!new URL(testUrl).pathname.endsWith('_test')) throw new Error('TEST_DATABASE_URL must name a dedicated *_test database.');
process.env.TEST_DATABASE_URL = testUrl;
process.env.DATABASE_URL = testUrl;
