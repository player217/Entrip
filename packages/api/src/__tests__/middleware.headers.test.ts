import request from 'supertest';
import { app } from '../index';

describe('Middleware headers & CORS exposure', () => {
  it('sets X-Request-ID on /health', async () => {
    const res = await request(app).get('/api/v2/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});
