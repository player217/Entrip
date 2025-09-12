import { renderHook, act } from '@testing-library/react';
import { useSessionStore } from '../sessionStore';

describe('useSessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  describe('Initial State', () => {
    it('should have null user initially', () => {
      const { result } = renderHook(() => useSessionStore());
      expect(result.current.user).toBeNull();
    });

    it('should not be authenticated initially', () => {
      const { result } = renderHook(() => useSessionStore());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login', () => {
    it('should set user and authenticate on successful login', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should use provided email in user object', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.login('custom@domain.com', 'pass');
      });

      expect(result.current.user?.email).toBe('custom@domain.com');
    });

    it('should handle empty email', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.login('', 'password');
      });

      // With empty email, login should not proceed
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle empty password', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.login('test@example.com', '');
      });

      // With empty password, login should not proceed
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should clear user and authentication status', async () => {
      const { result } = renderHook(() => useSessionStore());

      // First login
      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle logout when already logged out', () => {
      const { result } = renderHook(() => useSessionStore());

      // Logout when not logged in
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('User Object', () => {
    it('should have correct user properties', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.login('john@company.com', 'secure');
      });

      const user = result.current.user;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user?.id).toBe('1');
      expect(user?.name).toBe('Test User');
    });
  });

  describe('State Persistence', () => {
    it('should maintain state across multiple hook calls', async () => {
      const { result: result1 } = renderHook(() => useSessionStore());
      
      await act(async () => {
        await result1.current.login('persist@test.com', 'password');
      });

      // Create a new hook instance
      const { result: result2 } = renderHook(() => useSessionStore());
      
      // Should have the same state
      expect(result2.current.user?.email).toBe('persist@test.com');
      expect(result2.current.isAuthenticated).toBe(true);
    });
  });
});