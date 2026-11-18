import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useSWR from 'swr';
import MainLayout from '../layout';
const mockReplace = jest.fn();
const mockCheck = jest.fn().mockResolvedValue(false);
const mockSetState = jest.fn();
jest.mock('swr', () => ({ __esModule: true, default: jest.fn() }));
const mockHandlers = new Map<string, (...args: unknown[]) => void>();
jest.mock('@/lib/socket', () => ({
  initializeSocket: () => ({
    connected: true,
    on: (event: string, handle: (...args: unknown[]) => void) => mockHandlers.set(event, handle),
    off: (event: string) => mockHandlers.delete(event)
  })
}));
jest.mock('@/lib/auth-store', () => ({
  useAuthStore: Object.assign((select: (value: { user: typeof user }) => unknown) => select({ user }), {
    getState: () => ({ invalidateSession: mockCheck }), setState: (...args: unknown[]) => mockSetState(...args)
  })
}));
jest.mock('@/components/layout/AppFrame', () => ({ __esModule: true, default: ({ children, user }: any) => <div data-testid="app-frame">{user.email}{children}</div> }));
jest.mock('@/components/debug/LogViewer', () => ({ LogViewer: () => null }));
jest.mock('@/providers/ToastProvider', () => ({ ToastProvider: ({ children }: any) => <>{children}</> }));
jest.mock('@/components/messenger/MessengerContainer', () => ({ MessengerContainer: () => <div>Messenger</div> }));
const user = { id: 'u1', companyCode: 'j1', email: 'admin@j1.com', role: 'ADMIN' };
describe('authenticated application layout', () => {
  const originalLocation = window.location;
  beforeAll(() => Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, replace: mockReplace } }));
  afterAll(() => Object.defineProperty(window, 'location', { configurable: true, value: originalLocation }));
  beforeEach(() => { jest.clearAllMocks(); mockHandlers.clear(); (useSWR as jest.Mock).mockReturnValue({ data: user, isLoading: false, error: null, mutate: jest.fn() }); });
  it('passes the actual verified user to workspace and messenger state', () => {
    render(<MainLayout><p>예약 화면</p></MainLayout>);
    expect(screen.getByText('admin@j1.com')).toBeInTheDocument();
    expect(screen.getByText('예약 화면')).toBeInTheDocument();
    expect(mockSetState).toHaveBeenCalledWith(expect.objectContaining({ user }));
  });
  it('rechecks the signed-in employee when their company updates staff', async () => {
    const revalidate = jest.fn();
    (useSWR as jest.Mock).mockReturnValue({ data: user, isLoading: false, mutate: revalidate });
    render(<MainLayout>업무</MainLayout>);
    mockHandlers.get('company:changed')?.('users');
    await waitFor(() => expect(revalidate).toHaveBeenCalledTimes(1));
  });
  it('redirects only on definitive authentication failure', () => {
    (useSWR as jest.Mock).mockReturnValue({ error: { status: 401 }, isLoading: false });
    render(<MainLayout>private</MainLayout>);
    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('private')).not.toBeInTheDocument();
  });
  it('shows retry for unavailable backend without discarding session', () => {
    (useSWR as jest.Mock).mockReturnValue({ error: { status: 503 }, isLoading: false, mutate: jest.fn() });
    render(<MainLayout>private</MainLayout>);
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockCheck).not.toHaveBeenCalled();
  });
  it('keeps an already verified screen during transient revalidation errors', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: user, error: { status: 429 }, isLoading: false });
    render(<MainLayout><p>예약 화면</p></MainLayout>);
    expect(screen.getByText('예약 화면')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
