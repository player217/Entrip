import { useAuthStore } from '../src/lib/auth-store';
import { mutate } from 'swr';
jest.mock('swr', () => ({ mutate: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@entrip/shared/stores/workspaceStore', () => ({ useWorkspaceStore: { getState: () => ({ bindOwner: jest.fn() }) } }));
jest.mock('../src/lib/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

const user = { id: 'u1', email: 'admin@j1.com', name: 'J1 Admin', companyCode: 'j1', role: 'ADMIN' } as any;
describe('cookie session restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null, isLoading: false, error: null });
    global.fetch = jest.fn();
  });
  it('restores canonical me without any local storage token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data: { user } }) });
    expect(await useAuthStore.getState().checkAuth()).toBe(true);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(global.fetch).toHaveBeenCalledWith('/api/v2/auth/me', expect.objectContaining({ credentials: 'include' }));
  });
  it.each([429, 500, 502, 503])('preserves a verified session on %s', async status => {
    useAuthStore.setState({ isAuthenticated: true, user });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status });
    expect(await useAuthStore.getState().checkAuth()).toBe(true);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(mutate).not.toHaveBeenCalled();
  });
  it('clears identity and cached company data on unauthorized', async () => {
    useAuthStore.setState({ isAuthenticated: true, user });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    expect(await useAuthStore.getState().checkAuth()).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(mutate).toHaveBeenCalled();
  });
  it('clears cached data before changing company during login', async () => {
    useAuthStore.setState({ isAuthenticated: true, user });
    const next = { ...user, id: 'u2', companyCode: 'entrip' };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, user: next }) });
    expect(await useAuthStore.getState().login({ companyCode: 'entrip', username: 'admin@entrip.com', password: 'pass1234' })).toBe(true);
    expect(useAuthStore.getState().user?.companyCode).toBe('entrip');
    expect(mutate).toHaveBeenCalled();
  });
});
