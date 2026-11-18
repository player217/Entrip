import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mutate } from 'swr';
import type { LoginRequest, AuthState } from '@entrip/shared';
import { queryClient } from './queryClient';
import { disconnectSocket } from './socket';
import { useWorkspaceStore } from '@entrip/shared/stores/workspaceStore';

interface AuthStore extends AuthState {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  invalidateSession: () => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
}

function clearSessionData() {
  disconnectSocket();
  void mutate(() => true, undefined, { revalidate: false });
  queryClient.clear();
  useWorkspaceStore.getState().bindOwner(null);
  if (typeof window !== 'undefined') {
    try {
      for (const key of ['auth-token', 'token', 'accessToken', 'user', 'userId', 'auth-state']) localStorage.removeItem(key);
    } catch { /* Storage may be disabled; cookies remain the authentication source. */ }
    window.dispatchEvent(new Event('entrip:session-changed'));
  }
}

function notifyOtherTabs() {
  try { localStorage.setItem('entrip-session-revision', `${Date.now()}-${Math.random()}`); } catch { /* Optional cross-tab synchronization. */ }
}

const emptySession = { isAuthenticated: false, user: null, token: null, isLoading: false, error: null };
let sessionGeneration = 0;

function loginErrorMessage(status: number) {
  if (status === 400 || status === 401) return '아이디 또는 비밀번호가 올바르지 않습니다. 선택한 회사도 확인해 주세요.';
  if (status === 403) return '로그인할 수 없는 계정입니다. 관리자에게 문의해 주세요.';
  if (status === 429) return '로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.';
  if (status >= 500) return '로그인 서버에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  return '로그인에 실패했습니다. 입력 내용을 확인하고 다시 시도해 주세요.';
}

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
          notifyOtherTabs();
          return true;
        }
        set({ isLoading: false, error: loginErrorMessage(response.status) });
        return false;
      } catch {
        if (generation === sessionGeneration) set({ isLoading: false, error: '서버 연결에 실패했습니다.' });
        return false;
      }
    },
    invalidateSession: () => {
      ++sessionGeneration;
      clearSessionData();
      set(emptySession);
    },
    logout: async () => {
      ++sessionGeneration;
      clearSessionData();
      set(emptySession);
      try { await fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'include' }); }
      catch { /* Local state is cleared even when the server is unavailable. */ }
      finally {
        notifyOtherTabs();
        if (typeof window !== 'undefined') window.location.assign('/login');
      }
    },
    checkAuth: async () => {
      const generation = sessionGeneration;
      set({ isLoading: true });
      try {
        const response = await fetch('/api/v2/auth/me', { credentials: 'include', cache: 'no-store' });
        if (generation !== sessionGeneration) return get().isAuthenticated;
        if (response.status === 401 || response.status === 403) {
          get().invalidateSession();
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
