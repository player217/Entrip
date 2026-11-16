import { AxiosError, AxiosHeaders, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { apiClient as Client, handleApiError as HandleError } from '../apiClient';

let client: typeof Client;
let handleApiError: typeof HandleError;
const savedMode = process.env.NEXT_PUBLIC_API_AUTH_MODE;
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_AUTH_MODE = 'cookie';
  jest.resetModules();
  ({ apiClient: client, handleApiError } = require('../apiClient'));
  window.localStorage.clear();
});
afterAll(() => {
  if (savedMode === undefined) delete process.env.NEXT_PUBLIC_API_AUTH_MODE;
  else process.env.NEXT_PUBLIC_API_AUTH_MODE = savedMode;
});

const response = (config: InternalAxiosRequestConfig, data: unknown = { success: true }): AxiosResponse => ({
  config, data, status: 200, statusText: 'OK', headers: new AxiosHeaders(),
});

describe('handleApiError with actual Axios errors', () => {
  it('returns the API response message', () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response(config, { message: 'Custom error message' }));
    expect(handleApiError(error)).toBe('Custom error message');
  });
  it('preserves a network error message', () => {
    expect(handleApiError(new AxiosError('Network error', 'ERR_NETWORK'))).toBe('Network error');
  });
  it('uses the fallback for non-Axios errors', () => {
    expect(handleApiError(new Error('Unknown'))).toBe('알 수 없는 오류가 발생했습니다.');
  });
});

describe('real Axios client and interceptor contract', () => {
  it.each(['/bookings', '/api/bookings', '/api/v2/bookings'])('uses the same-origin proxy without duplicated API prefixes: %s', async url => {
    let observed: InternalAxiosRequestConfig | undefined;
    const result = await client.get(url, {
      withCredentials: false,
      headers: { Authorization: 'Bearer stale-local-token' },
      adapter: async config => { observed = config; return response(config); },
    });
    expect(result.data).toEqual({ success: true });
    expect(observed).toMatchObject({ baseURL: '/api', url: '/bookings', withCredentials: true, timeout: 10000 });
    expect(observed?.headers.get('Authorization')).toBeUndefined();
    expect(observed?.headers.get('Content-Type')).toBe('application/json');
  });
  it('returns unauthorized responses to the caller without clearing cookie-mode session storage or navigating', async () => {
    window.localStorage.setItem('accessToken', 'unrelated-legacy-token');
    const before = window.location.href;
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    const error = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, { ...response(config), status: 401 });
    await expect(client.get('/auth/me', { adapter: async () => { throw error; } })).rejects.toBe(error);
    expect(window.localStorage.getItem('accessToken')).toBe('unrelated-legacy-token');
    expect(window.location.href).toBe(before);
  });
  it('supports explicitly configured bearer mode while preserving proxy routing', async () => {
    process.env.NEXT_PUBLIC_API_AUTH_MODE = 'bearer';
    window.localStorage.setItem('accessToken', 'configured-token');
    jest.resetModules();
    const bearerClient: typeof Client = require('../apiClient').apiClient;
    let authorization: unknown;
    await bearerClient.get('/users', { adapter: async config => { authorization = config.headers.get('Authorization'); return response(config); } });
    expect(authorization).toBe('Bearer configured-token');
  });
});
