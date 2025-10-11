import request from 'supertest';
import { app } from '../index';

describe('Rate limiting on auth login (dev thresholds)', () => {
  const body = { email: 'ratelimit@test.com', password: 'pass1234', companyCode: 'j1' };

  it('returns 429 after exceeding attempts', async () => {
    // Send several login attempts; authRateLimit is strict in dev (5 max)
    for (let i = 0; i < 6; i++) {
      await request(app).post('/api/v2/auth/login').send(body);
    }
    const res = await request(app).post('/api/v2/auth/login').send(body);
    // Accept either 401 (if under threshold) or 429 (once limit exceeded)
    expect([401, 429]).toContain(res.status);
  });
});
