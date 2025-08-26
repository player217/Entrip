import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic debounce timing accuracy', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should debounce value change with exact timing', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        }
      );

      // Initial value
      expect(result.current).toBe('initial');

      // Update value
      rerender({ value: 'updated', delay: 500 });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Advance time but not enough
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(result.current).toBe('initial');

      // Advance to exactly the delay time
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('Value updates after delay', () => {
    it('should update to new value after delay period', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 'first' },
        }
      );

      expect(result.current).toBe('first');

      // Update value
      rerender({ value: 'second' });
      expect(result.current).toBe('first');

      // Wait for delay
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe('second');
    });

    it('should handle different data types', () => {
      // Test with number
      const { result: numberResult, rerender: rerenderNumber } = renderHook(
        ({ value }) => useDebounce(value, 200),
        { initialProps: { value: 42 } }
      );

      rerenderNumber({ value: 100 });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(numberResult.current).toBe(100);

      // Test with object
      const { result: objectResult, rerender: rerenderObject } = renderHook(
        ({ value }) => useDebounce(value, 200),
        { initialProps: { value: { name: 'John' } } }
      );

      const newObject = { name: 'Jane' };
      rerenderObject({ value: newObject });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(objectResult.current).toEqual(newObject);

      // Test with array
      const { result: arrayResult, rerender: rerenderArray } = renderHook(
        ({ value }) => useDebounce(value, 200),
        { initialProps: { value: [1, 2, 3] } }
      );

      const newArray = [4, 5, 6];
      rerenderArray({ value: newArray });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(arrayResult.current).toEqual(newArray);
    });
  });

  describe('Cleanup on unmount', () => {
    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 1000),
        {
          initialProps: { value: 'initial' },
        }
      );

      // Trigger a debounce
      rerender({ value: 'updated' });

      // Unmount before timeout completes
      unmount();

      // Verify clearTimeout was called
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('should not update state after unmount', () => {
      const { result, unmount, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        {
          initialProps: { value: 'initial' },
        }
      );

      // Update value
      rerender({ value: 'updated' });
      expect(result.current).toBe('initial');

      // Unmount before delay
      unmount();

      // Advance timers - should not cause state update
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Value should remain unchanged (component is unmounted)
      expect(result.current).toBe('initial');
    });
  });

  describe('Multiple rapid changes', () => {
    it('should only apply the last value when multiple updates occur', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        {
          initialProps: { value: 'first' },
        }
      );

      // Multiple rapid updates
      rerender({ value: 'second' });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      rerender({ value: 'third' });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      rerender({ value: 'fourth' });
      act(() => {
        jest.advanceTimersByTime(100);
      });
      
      rerender({ value: 'final' });

      // Value should still be initial
      expect(result.current).toBe('first');

      // Advance past the delay from the last update
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Only the final value should be applied
      expect(result.current).toBe('final');
    });

    it('should reset timer on each value change', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 0 },
        }
      );

      // First update
      rerender({ value: 1 });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(result.current).toBe(0); // Not enough time

      // Second update resets timer
      rerender({ value: 2 });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(result.current).toBe(0); // Timer was reset

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(result.current).toBe(2);
    });

    it('should handle continuous updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 200),
        {
          initialProps: { value: 0 },
        }
      );

      // Simulate continuous updates (like typing)
      for (let i = 1; i <= 10; i++) {
        rerender({ value: i });
        act(() => {
          jest.advanceTimersByTime(50);
        });
        // Value should not update during rapid changes
        expect(result.current).toBe(0);
      }

      // Wait for debounce delay after last update
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should have the last value
      expect(result.current).toBe(10);
    });
  });

  describe('Different delay values', () => {
    it('should work with zero delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });
      
      // With 0 delay, should update immediately in next tick
      act(() => {
        jest.runAllTimers();
      });
      
      expect(result.current).toBe('updated');
    });

    it('should work with very short delays', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 10),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });
      
      act(() => {
        jest.advanceTimersByTime(10);
      });
      
      expect(result.current).toBe('updated');
    });

    it('should work with very long delays', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 10000),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });
      
      // Advance time significantly
      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(result.current).toBe('initial');
      
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should handle delay changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        }
      );

      // Update with different delay
      rerender({ value: 'updated', delay: 200 });
      
      // Old timeout should be cleared, new one set
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      expect(result.current).toBe('updated');
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: null as string | null },
        }
      );

      expect(result.current).toBe(null);

      rerender({ value: undefined as string | undefined });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe(undefined);

      rerender({ value: 'defined' });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current).toBe('defined');
    });

    it('should handle negative delay values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, -100),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });
      
      // Negative delays should work like 0 delay
      act(() => {
        jest.runAllTimers();
      });
      
      expect(result.current).toBe('updated');
    });

    it('should maintain referential equality for objects when value does not change', () => {
      const obj = { id: 1, name: 'test' };
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: obj },
        }
      );

      const initialResult = result.current;

      // Re-render with same object reference
      rerender({ value: obj });
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should maintain same reference
      expect(result.current).toBe(initialResult);
    });
  });
});