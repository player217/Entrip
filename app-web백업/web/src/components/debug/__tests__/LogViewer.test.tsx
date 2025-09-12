import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogViewer } from '../LogViewer';

// Mock logger module
const mockGetRecentLogs = jest.fn();
const mockClearLogs = jest.fn();
const mockDownloadLogs = jest.fn();

jest.mock('@entrip/shared', () => ({
  logger: {
    getRecentLogs: mockGetRecentLogs,
    clearLogs: mockClearLogs,
    downloadLogs: mockDownloadLogs,
  },
}));

describe('LogViewer', () => {
  const mockLogs = [
    {
      timestamp: '2025-06-30T10:00:00.000Z',
      level: 'info' as const,
      component: 'App',
      message: 'Application started',
    },
    {
      timestamp: '2025-06-30T10:01:00.000Z',
      level: 'error' as const,
      component: 'API',
      message: 'Request failed',
      error: new Error('Network error'),
      stack: 'Error: Network error\n  at fetchData (api.js:10)',
    },
    {
      timestamp: '2025-06-30T10:02:00.000Z',
      level: 'warn' as const,
      component: 'Auth',
      message: 'Session expiring soon',
      data: { userId: '123', expiresIn: 300 },
    },
  ];

  let originalEnv: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecentLogs.mockReturnValue(mockLogs);
    mockClearLogs.mockImplementation(() => {});
    mockDownloadLogs.mockImplementation(() => {});
    
    // Save original NODE_ENV
    originalEnv = process.env.NODE_ENV;
    // @ts-expect-error - we need to modify this for testing
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original NODE_ENV
    // @ts-expect-error - we need to modify this for testing
    process.env.NODE_ENV = originalEnv;
  });

  it('renders floating button in development mode', () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    expect(button).toBeInTheDocument();
  });

  it('does not render in production mode', () => {
    // @ts-expect-error - we need to modify this for testing
    process.env.NODE_ENV = 'production';
    render(<LogViewer />);
    
    const button = screen.queryByTitle('로그 뷰어');
    expect(button).not.toBeInTheDocument();
  });

  it('opens log panel when clicking floating button', () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    expect(screen.getByText('로그 뷰어')).toBeInTheDocument();
    expect(screen.getByText('Application started')).toBeInTheDocument();
  });

  it('displays all log entries', async () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Application started')).toBeInTheDocument();
      expect(screen.getByText('Request failed')).toBeInTheDocument();
      expect(screen.getByText('Session expiring soon')).toBeInTheDocument();
    });
  });

  it('filters logs by level', async () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    // Click error filter
    const errorFilter = screen.getByText('ERROR');
    fireEvent.click(errorFilter);
    
    await waitFor(() => {
      expect(screen.getByText('Request failed')).toBeInTheDocument();
      expect(screen.queryByText('Application started')).not.toBeInTheDocument();
      expect(screen.queryByText('Session expiring soon')).not.toBeInTheDocument();
    });
  });

  it('shows log details when clicking on entry', async () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    await waitFor(() => {
      const logWithData = screen.getByText('Session expiring soon').closest('div');
      fireEvent.click(logWithData!);
    });
    
    // Check if details section appears
    const detailsButton = screen.getByText('데이터 보기');
    fireEvent.click(detailsButton);
    
    expect(screen.getByText(/userId.*123/)).toBeInTheDocument();
  });

  it('clears logs when clicking clear button', async () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    const clearButton = screen.getByTitle('로그 클리어');
    fireEvent.click(clearButton);
    
    expect(mockClearLogs).toHaveBeenCalled();
  });

  it('downloads logs when clicking download button', async () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    const downloadButton = screen.getByTitle('로그 다운로드');
    fireEvent.click(downloadButton);
    
    expect(mockDownloadLogs).toHaveBeenCalled();
  });

  it('closes panel when clicking close button', () => {
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    expect(screen.getByText('로그 뷰어')).toBeInTheDocument();
    
    const closeButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('[class*="ph:x-bold"]')
    );
    fireEvent.click(closeButton!);
    
    expect(screen.queryByText('로그 뷰어')).not.toBeInTheDocument();
  });

  it('updates logs periodically when open', async () => {
    jest.useFakeTimers();
    
    render(<LogViewer />);
    
    const button = screen.getByTitle('로그 뷰어');
    fireEvent.click(button);
    
    expect(mockGetRecentLogs).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(1000);
    
    expect(mockGetRecentLogs).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });
});