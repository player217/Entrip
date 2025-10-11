import request from 'supertest';
import { app } from '../index';

describe('Rate limit isolation via X-Test-Run-Id', () => {
  const body = { email: 'ratelimit+isolation@test.com', password: 'pass1234', companyCode: 'j1' };

  it('separate run ids do not share counters', async () => {
    const runA = `rl-${Date.now()}-A`;
    const runB = `rl-${Date.now()}-B`;

    // Saturate run A (dev limit ~5). We ignore exact boundary; just make several calls.
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/v2/auth/login')
        .set('X-Test-Run-Id', runA)
        .send(body);
    }

    // Fresh run id B should not be rate limited on first request
    const firstB = await request(app)
      .post('/api/v2/auth/login')
      .set('X-Test-Run-Id', runB)
      .send(body);

    expect(firstB.status).not.toBe(429);
  });
});

