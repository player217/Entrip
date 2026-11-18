import type { NextFunction, Request, Response } from 'express';
import { apiRateLimit, publicFxRateLimit, rateLimiter } from '../middlewares/rateLimit.middleware';

afterEach(() => {
  jest.restoreAllMocks();
  rateLimiter.clear();
});

it('uses separate budgets for public rates and signed-out API requests from the same address', () => {
  const request = { ip: '192.0.2.12', get: () => '', socket: {} } as unknown as Request;
  const response = { setHeader: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  publicFxRateLimit(request, response, next);
  apiRateLimit(request, response, next);
  expect(next).toHaveBeenCalledTimes(2);
  expect(rateLimiter.getStoreInfo().keys).toEqual(expect.arrayContaining([
    expect.stringContaining('192.0.2.12:public-fx'),
    expect.stringContaining('192.0.2.12:anonymous'),
  ]));
});

it('keeps a progressive penalty deadline stable and accepts requests after it expires', () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(10_000);
  const limits = { windowMs: 1000, maxRequests: 1, maxViolations: 1, enableProgressivePenalty: true, message: 'wait' };
  const key = 'deadline-test';
  expect(rateLimiter.check(key, limits).allowed).toBe(true);
  expect(rateLimiter.check(key, limits).allowed).toBe(false);
  const blocked = rateLimiter.check(key, limits);
  expect(blocked.allowed).toBe(false);
  now.mockReturnValue(blocked.resetTime - 10);
  expect(rateLimiter.check(key, limits)).toEqual(blocked);
  now.mockReturnValue(blocked.resetTime + 1);
  expect(rateLimiter.check(key, limits).allowed).toBe(true);
});
