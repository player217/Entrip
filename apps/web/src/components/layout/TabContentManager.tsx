'use client'

import React, { useEffect, useCallback, useMemo } from 'react'
import { useWorkspaceStore } from '@entrip/shared/client'
import { TabContent } from './TabContent'
import { useRouter, usePathname } from 'next/navigation'

export function TabContentManager() {
  const { tabs, activeTabKey, updateTab, updateTabState, setActiveTab } = useWorkspaceStore()
  const router = useRouter()
  const pathname = usePathname()
  
  // 현재 활성 탭 찾기
  const activeTab = useMemo(
    () => tabs.find(t => t.key === activeTabKey),
    [tabs, activeTabKey]
  )
  
  // 탭 상태 변경 핸들러
  const handleTabStateChange = useCallback((tabKey: string, state: any) => {
    updateTabState(tabKey, state)
  }, [updateTabState])
  
  // URL 변경 감지 및 활성 탭 업데이트
  useEffect(() => {
    if (activeTab && activeTab.route !== pathname) {
      // URL이 변경되면 활성 탭의 route 업데이트
      updateTab(activeTabKey!, { 
        route: pathname,
        history: [...(activeTab.history || []), pathname]
      })
    }
  }, [pathname, activeTab, activeTabKey, updateTab])
  
  // 탭 내비게이션 처리
  useEffect(() => {
    // 브라우저 뒤로가기/앞으로가기 처리
    const handlePopState = () => {
      const currentTab = tabs.find(t => t.route === window.location.pathname)
      if (currentTab && currentTab.key !== activeTabKey) {
        setActiveTab(currentTab.key)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [tabs, activeTabKey, setActiveTab])
  
  // 탭이 없으면 아무것도 렌더링하지 않음
  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>탭이 없습니다.</p>
      </div>
    )
  }
  
  return (
    <div className="tab-content-manager h-full w-full relative">
      {tabs.map((tab) => (
        <TabContent
          key={tab.key}
          tabKey={tab.key}
          route={tab.route}
          visible={tab.key === activeTabKey}
          savedState={tab.state}
          onStateChange={(state) => handleTabStateChange(tab.key, state)}
        />
      ))}
    </div>
  )
}