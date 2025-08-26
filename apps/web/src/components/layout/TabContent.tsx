'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

interface TabContentProps {
  tabKey: string
  route: string
  visible: boolean
  onStateChange?: (state: any) => void
  savedState?: any
}

// 라우트별 컴포넌트 동적 로딩 - 고유 컴포넌트 사용 (page.tsx 안티패턴 해결)
const routeComponents: Record<string, React.ComponentType<any>> = {
  '/': dynamic(() => import('../pages/DashboardPageContent'), { ssr: false }),
  '/dashboard': dynamic(() => import('../pages/DashboardPageContent'), { ssr: false }),
  '/calendar-performance': dynamic(() => import('../pages/CalendarPerformancePageContent'), { ssr: false }),
  '/approval': dynamic(() => import('../pages/ApprovalPageContent'), { ssr: false }),
  '/accounts': dynamic(() => import('../pages/AccountsPageContent'), { ssr: false }),
  '/stats': dynamic(() => import('../pages/StatsPageContent'), { ssr: false }),
  '/settings': dynamic(() => import('../pages/SettingsPageContent'), { ssr: false }),
  '/mail': dynamic(() => import('../pages/MailPageContent'), { ssr: false }),
  '/chat': dynamic(() => import('../pages/ChatPageContent'), { ssr: false }),
  '/flow': dynamic(() => import('../pages/FlowPageContent'), { ssr: false }),
  '/workspace': dynamic(() => import('../pages/WorkspacePageContent'), { ssr: false }),
  '/flight-schedule': dynamic(() => import('../pages/FlightSchedulePageContent'), { ssr: false }),
  '/reservations': dynamic(() => import('../pages/ReservationsPageContent'), { ssr: false }),
}

export function TabContent({ 
  tabKey, 
  route, 
  visible, 
  onStateChange,
  savedState 
}: TabContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // 스크롤 위치 저장 및 복원
  useEffect(() => {
    if (!containerRef.current) return
    
    if (visible && savedState?.scrollPosition) {
      // 탭이 활성화될 때 스크롤 위치 복원
      containerRef.current.scrollTop = savedState.scrollPosition
    }
    
    const handleScroll = () => {
      if (visible && containerRef.current) {
        const position = containerRef.current.scrollTop
        setScrollPosition(position)
        onStateChange?.({ scrollPosition: position })
      }
    }
    
    const container = containerRef.current
    container?.addEventListener('scroll', handleScroll)
    
    return () => {
      container?.removeEventListener('scroll', handleScroll)
    }
  }, [visible, savedState, onStateChange])
  
  // 컴포넌트 로드 상태 관리
  useEffect(() => {
    if (visible && !isLoaded) {
      setIsLoaded(true)
    }
  }, [visible, isLoaded])
  
  // 라우트에 해당하는 컴포넌트 가져오기
  const Component = routeComponents[route] || routeComponents['/']
  
  return (
    <div
      ref={containerRef}
      className="tab-content-container"
      style={{
        display: visible ? 'block' : 'none',
        height: '100%',
        width: '100%',
        overflow: 'auto',
        position: 'relative'
      }}
      data-tab-key={tabKey}
    >
      {/* 한 번 로드된 컴포넌트는 계속 유지 */}
      {(isLoaded || visible) && (
        <div className="tab-content-wrapper">
          <Component />
        </div>
      )}
    </div>
  )
}