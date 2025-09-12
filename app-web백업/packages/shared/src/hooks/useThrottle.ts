import { useCallback, useRef, useEffect } from 'react';

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 함수 호출을 제한하는 throttle 훅
 * @param callback 제한할 함수
 * @param delay 제한 시간 (ms)
 * @param options leading: 첫 호출 즉시 실행, trailing: 마지막 호출 지연 실행
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  options: ThrottleOptions = { leading: true, trailing: true }
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRunRef = useRef<number>(0);
  const lastArgsRef = useRef<unknown[]>([]);
  const pendingRef = useRef<boolean>(false);
  
  const { leading = true, trailing = true } = options;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const throttledFunction = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = lastRunRef.current ? delay - (now - lastRunRef.current) : 0;
    
    lastArgsRef.current = args;
    
    if (remaining <= 0 || !lastRunRef.current) {
      // Can execute now
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!lastRunRef.current) {
        // First call
        if (leading) {
          lastRunRef.current = now;
          pendingRef.current = false;
          callback(...args);
        } else {
          // Mark the start time but don't execute
          lastRunRef.current = now;
          pendingRef.current = true;
          
          // Schedule trailing for first call without leading
          if (trailing) {
            timeoutRef.current = setTimeout(() => {
              lastRunRef.current = Date.now();
              pendingRef.current = false;
              callback(...lastArgsRef.current);
              timeoutRef.current = null;
            }, delay);
          }
        }
      } else {
        // Subsequent calls after delay
        lastRunRef.current = now;
        pendingRef.current = false;
        callback(...args);
      }
    } else {
      // Still in throttle period
      pendingRef.current = true;
      
      if (!timeoutRef.current && trailing) {
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          pendingRef.current = false;
          callback(...lastArgsRef.current);
          timeoutRef.current = null;
        }, remaining);
      }
    }
  }, [callback, delay, leading, trailing]) as T;
  
  return throttledFunction;
}