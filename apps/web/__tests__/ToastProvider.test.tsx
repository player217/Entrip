import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../src/providers/ToastProvider';

jest.mock('@entrip/shared', () => {
  const actual = jest.requireActual('@entrip/shared');
  return {
    ...actual,
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('ToastProvider', () => {
  const TestComponent = () => {
    const { addToast, removeToast, toasts } = useToast();
    return (
      <div>
        <button
          onClick={() =>
            addToast({
              type: 'success',
              title: '성공',
              message: '완료되었습니다',
              duration: 100,
            })
          }
        >
          add
        </button>
        <button
          onClick={() => toasts[0] && removeToast(toasts[0].id)}
        >
          remove
        </button>
        <div data-testid="toast-count">{toasts.length}</div>
      </div>
    );
  };

  const renderWithProvider = () =>
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('adds and removes toast manually', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('add'));
    expect(screen.getByText('성공')).toBeInTheDocument();
    expect(screen.getByText('완료되었습니다')).toBeInTheDocument();
    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    fireEvent.click(screen.getByText('remove'));
    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  it('auto-dismisses toast after duration', () => {
    renderWithProvider();

    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

});
