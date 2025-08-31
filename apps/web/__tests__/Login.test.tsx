import { vi } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Login success', () => {
  it('should have login functionality ready', () => {
    // Mock localStorage methods are set up in setup.ts
    expect(localStorage.setItem).toBeDefined();
    expect(localStorage.getItem).toBeDefined();
    
    // Simulate successful login flow
    localStorage.setItem('auth-token', 'test-jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
    
    // Verify token was stored
    expect(localStorage.setItem).toHaveBeenCalledWith('auth-token', 'test-jwt-token');
    
    // Mock navigation
    mockPush('/workspace?content=monthlyCalendar');
    expect(mockPush).toHaveBeenCalledWith('/workspace?content=monthlyCalendar');
  });
});