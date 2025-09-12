'use client';

import { useState, useEffect } from 'react';

interface UseViewportHeightOptions {
  headerHeight?: number;
  footerHeight?: number;
  offset?: number;
}

/**
 * 뷰포트 높이를 동적으로 계산하는 훅
 * 헤더, 푸터 등 고정 요소의 높이를 제외한 사용 가능한 높이를 반환
 */
export function useViewportHeight(options: UseViewportHeightOptions = {}) {
  const { 
    headerHeight = 70, 
    footerHeight = 0, 
    offset = 0 
  } = options;
  
  const [availableHeight, setAvailableHeight] = useState<string>('100vh');
  const [dimensions, setDimensions] = useState({
    windowHeight: 0,
    availableHeightPx: 0
  });

  useEffect(() => {
    const calculateHeight = () => {
      if (typeof window !== 'undefined') {
        const windowHeight = window.innerHeight;
        const calculatedHeight = windowHeight - headerHeight - footerHeight - offset;
        
        setAvailableHeight(`${calculatedHeight}px`);
        setDimensions({
          windowHeight,
          availableHeightPx: calculatedHeight
        });
      }
    };

    // 초기 계산
    calculateHeight();

    // 윈도우 리사이즈 이벤트 리스너
    const handleResize = () => {
      calculateHeight();
    };

    window.addEventListener('resize', handleResize);
    
    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [headerHeight, footerHeight, offset]);

  return {
    availableHeight,
    dimensions,
    cssHeight: `calc(100vh - ${headerHeight + footerHeight + offset}px)`
  };
}

/**
 * 사이드바용 높이 계산 훅
 */
export function useSidebarHeight() {
  return useViewportHeight({ headerHeight: 70 });
}

/**
 * 메인 컨텐츠용 높이 계산 훅
 */
export function useMainContentHeight(footerHeight = 0) {
  return useViewportHeight({ headerHeight: 70, footerHeight });
}