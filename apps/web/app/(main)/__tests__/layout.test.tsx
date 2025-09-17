import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RootLayout from '../layout';

// Mock SWR to avoid network calls in tests
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: { user: { id: 1, email: 'test@example.com', role: 'USER' } },
    isLoading: false,
    error: null,
  })),
}));

// Mock Next.js redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock Google Fonts
jest.mock('next/font/google', () => ({
  Inter: jest.fn(() => ({
    className: 'mocked-inter-font',
  })),
}));

// Mock components used in layout
jest.mock('@/components/layout/AppFrame', () => ({
  __esModule: true,
  default: ({ children, user }: { children: React.ReactNode; user: any }) => (
    <div data-testid="app-frame">
      <div data-testid="user-info">{user?.email}</div>
      {children}
    </div>
  ),
}));

jest.mock('@/components/debug/LogViewer', () => ({
  LogViewer: () => <div data-testid="log-viewer">LogViewer</div>,
}));

jest.mock('@/providers/ToastProvider', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
}));

jest.mock('@/components/messenger/MessengerContainer', () => ({
  MessengerContainer: () => <div data-testid="messenger">MessengerContainer</div>,
}));

describe('MainLayout', () => {
  it('renders all layout components when authenticated', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('app-frame')).toBeInTheDocument();
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
    expect(screen.getByTestId('messenger')).toBeInTheDocument();
    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays user information', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('user-info')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders children inside app frame', () => {
    render(
      <RootLayout>
        <h1>Page Title</h1>
        <p>Page content</p>
      </RootLayout>
    );

    expect(screen.getByText('Page Title')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('includes toast provider for notifications', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
  });

  it('includes messenger container', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('messenger')).toBeInTheDocument();
  });

  it('includes log viewer for debugging', () => {
    render(
      <RootLayout>
        <div>Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('log-viewer')).toBeInTheDocument();
  });

  it('renders empty content gracefully', () => {
    render(<RootLayout>{null}</RootLayout>);

    expect(screen.getByTestId('app-frame')).toBeInTheDocument();
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
  });

  it('renders with fragment children', () => {
    render(
      <RootLayout>
        <>
          <div>First</div>
          <div>Second</div>
        </>
      </RootLayout>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});