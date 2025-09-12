import { renderHook, act } from '@testing-library/react';
import { useThrottle } from '../useThrottle';

// 각 테스트에서 개별적으로 타이머 설정
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('useThrottle', () => {
  
  describe('기본 동작', () => {
    it('지정된 시간 동안 함수 호출을 제한한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 1000));
      
      act(() => {
        result.current();
        result.current();
        result.current();
      });
      
      // leading이 true이므로 첫 호출은 즉시 실행
      expect(callback).toHaveBeenCalledTimes(1);
      
      // 1초 후
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // trailing이 true이므로 마지막 호출도 실행
      expect(callback).toHaveBeenCalledTimes(2);
    });
    
    it('delay 시간이 지난 후 다시 호출할 수 있다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 500));
      
      act(() => {
        result.current();
      });
      expect(callback).toHaveBeenCalledTimes(1);
      
      // 500ms 후
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // 새로운 호출
      act(() => {
        result.current();
      });
      expect(callback).toHaveBeenCalledTimes(2);
    });
    
    it('인자를 올바르게 전달한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 1000));
      
      act(() => {
        result.current('arg1', 'arg2', { key: 'value' });
      });
      
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });
  });
  
  describe('leading 옵션', () => {
    it('leading: true일 때 첫 호출을 즉시 실행한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 1000, { leading: true, trailing: false })
      );
      
      act(() => {
        result.current();
      });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('leading: false일 때 첫 호출을 지연한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 1000, { leading: false, trailing: true })
      );
      
      act(() => {
        result.current();
      });
      
      expect(callback).toHaveBeenCalledTimes(0);
      
      act(() => {
        jest.runAllTimers();
      });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('trailing 옵션', () => {
    it('trailing: true일 때 마지막 호출을 실행한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 1000, { leading: true, trailing: true })
      );
      
      act(() => {
        result.current('first');
        jest.advanceTimersByTime(500);
        result.current('second');
        result.current('third');
      });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
      
      act(() => {
        jest.runAllTimers();
      });
      
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('third');
    });
    
    it('trailing: false일 때 마지막 호출을 무시한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 1000, { leading: true, trailing: false })
      );
      
      act(() => {
        result.current('first');
        result.current('second');
        result.current('third');
      });
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('first');
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // trailing이 false이므로 추가 호출 없음
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('leading과 trailing 조합', () => {
    it('둘 다 false일 때는 아무것도 실행하지 않는다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 1000, { leading: false, trailing: false })
      );
      
      act(() => {
        result.current();
        result.current();
      });
      
      expect(callback).toHaveBeenCalledTimes(0);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(callback).toHaveBeenCalledTimes(0);
    });
    
    it('연속 호출 시 올바르게 동작한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(callback, 300, { leading: true, trailing: true })
      );
      
      act(() => {
        // 0ms: 첫 호출 (즉시 실행)
        result.current(1);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(1);
        
        // 100ms: throttled
        jest.advanceTimersByTime(100);
        result.current(2);
        expect(callback).toHaveBeenCalledTimes(1);
        
        // 200ms: throttled
        jest.advanceTimersByTime(100);
        result.current(3);
        expect(callback).toHaveBeenCalledTimes(1);
        
        // 300ms: trailing 실행
        jest.advanceTimersByTime(100);
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenLastCalledWith(3);
      });
      
      // 새로운 act 블록에서 다음 사이클 시작
      act(() => {
        // throttle period가 완전히 끝나도록 충분한 시간 대기
        jest.advanceTimersByTime(301);
        result.current(4);
        // 새로운 사이클이므로 3번째 호출이 됨
        expect(callback).toHaveBeenCalledTimes(3);
        expect(callback).toHaveBeenLastCalledWith(4);
      });
    });
  });
  
  describe('엣지 케이스', () => {
    it('delay가 0일 때도 동작한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, 0));
      
      act(() => {
        result.current();
        result.current();
      });
      
      // delay가 0이므로 모든 호출이 즉시 실행
      expect(callback).toHaveBeenCalledTimes(2);
    });
    
    it('음수 delay는 0으로 처리한다', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useThrottle(callback, -100));
      
      act(() => {
        result.current();
        result.current();
      });
      
      expect(callback).toHaveBeenCalledTimes(2);
    });
    
    it('컴포넌트 언마운트 시 타이머를 정리한다', () => {
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => 
        useThrottle(callback, 1000, { leading: false, trailing: true })
      );
      
      act(() => {
        result.current();
      });
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // 언마운트 후에는 콜백이 실행되지 않아야 함
      expect(callback).toHaveBeenCalledTimes(0);
    });
  });
  
  describe('실제 사용 사례', () => {
    it('스크롤 이벤트 처리에 사용할 수 있다', () => {
      const handleScroll = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(handleScroll, 100, { leading: true, trailing: true })
      );
      
      // 빠른 스크롤 시뮬레이션
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current({ scrollTop: i * 100 });
          jest.advanceTimersByTime(20);
        }
      });
      
      // 200ms 동안 10번 호출했지만 throttle로 인해 제한됨
      // 0ms(leading), 100ms 후, 200ms(trailing) = 3번
      expect(handleScroll).toHaveBeenCalledTimes(3);
    });
    
    it('검색 입력 처리에 사용할 수 있다', () => {
      const search = jest.fn();
      const { result } = renderHook(() => 
        useThrottle(search, 500, { leading: false, trailing: true })
      );
      
      // 사용자가 빠르게 타이핑
      act(() => {
        result.current('a');
        jest.advanceTimersByTime(100);
        result.current('ab');
        jest.advanceTimersByTime(100);
        result.current('abc');
      });
      
      // leading: false이므로 아직 실행 안됨
      expect(search).toHaveBeenCalledTimes(0);
      
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // 500ms 후 마지막 값으로 검색
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('abc');
    });
  });
});