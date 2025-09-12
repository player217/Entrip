import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  company?: string;
}

interface SessionStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, password: string) => {
    // TODO: Implement actual API call
    // Mock login for now
    if (email && password) {
      set({
        user: { id: '1', email, name: 'Test User' },
        isAuthenticated: true,
      });
    }
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));