import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mutate } from 'swr';
import type { LoginRequest, AuthState } from '@entrip/shared';
import { queryClient } from './queryClient';
import { useWorkspaceStore } from '@entrip/shared/stores/workspaceStore';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

function clearSessionData() {
  void mutate(() => true, undefined, { revalidate: false });
  queryClient.clear();
  useWorkspaceStore.getState().bindOwner(null);
  if (typeof window !== 'undefined') {
    for (const key of ['auth-token', 'token', 'accessToken', 'user', 'userId', 'auth-state']) localStorage.removeItem(key);
    window.dispatchEvent(new Event('entrip:session-changed'));
  }
}

const emptySession = { isAuthenticated: false, user: null, token: null, isLoading: false, error: null };
let sessionGeneration = 0;

export const useAuthStore = create<AuthStore>()(
  persist((set, get) => ({
    ...emptySession,
    login: async (credentials) => {
      const generation = ++sessionGeneration;
      set({ isLoading: true, error: null });
      try {
        const response = await fetch('/api/v2/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ email: credentials.username, password: credentials.password, companyCode: credentials.companyCode }),
        });
        const data = await response.json();
        if (generation !== sessionGeneration) return false;
        const user = data.data?.user ?? data.user;
        if (response.ok && data.success && user) {
          clearSessionData();
          set({ isAuthenticated: true, user, token: null, isLoading: false, error: null });
          return true;
        }
        set({ isLoading: false, error: data.message || '로그인에 실패했습니다.' });
        return false;
      } catch {
        if (generation === sessionGeneration) set({ isLoading: false, error: '서버 연결에 실패했습니다.' });
        return false;
      }
    },
    logout: async () => {
      ++sessionGeneration;
      clearSessionData();
      set(emptySession);
      try { await fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'include' }); }
      catch { /* Local state is cleared even when the server is unavailable. */ }
      finally { if (typeof window !== 'undefined') window.location.assign('/login'); }
    },
    checkAuth: async () => {
      const generation = sessionGeneration;
      set({ isLoading: true });
      try {
        const response = await fetch('/api/v2/auth/me', { credentials: 'include', cache: 'no-store' });
        if (generation !== sessionGeneration) return get().isAuthenticated;
        if (response.status === 401 || response.status === 403) {
          clearSessionData();
          set(emptySession);
          return false;
        }
        if (!response.ok) throw new Error('인증 서버에 일시적으로 연결할 수 없습니다.');
        const data = await response.json();
        const user = data.data?.user ?? data.user;
        if (!data.success || !user) throw new Error('인증 응답을 확인할 수 없습니다.');
        const previous = get().user;
        if (previous && (previous.id !== user.id || previous.companyCode !== user.companyCode)) clearSessionData();
        set({ isAuthenticated: true, user, token: null, isLoading: false, error: null });
        return true;
      } catch {
        if (generation === sessionGeneration) set({ isLoading: false, error: '인증 연결을 다시 확인해주세요.' });
        // A network failure or rate limit does not revoke a valid cookie session.
        return get().isAuthenticated;
      }
    },
    clearError: () => set({ error: null }),
    setLoading: isLoading => set({ isLoading }),
  }), {
    name: 'auth-storage',
    storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }),
    partialize: state => ({ isAuthenticated: state.isAuthenticated, user: state.user }),
  })
);

export const useUserRole = () => {
  const user = useAuthStore(state => state.user);
  return { isAdmin: user?.role === 'ADMIN', isManager: user?.role === 'MANAGER' || user?.role === 'ADMIN', isUser: !!user, role: user?.role };
};
