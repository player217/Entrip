// Ensure NODE_ENV is set before any modules import config
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}
// Provide a default, unique rate limit prefix to isolate tests
if (!process.env.RATE_LIMIT_PREFIX) {
  process.env.RATE_LIMIT_PREFIX = `jest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

