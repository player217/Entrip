'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@entrip/shared/client';

export function useTabRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTabKey, tabs, updateTab, setActiveTab } = useWorkspaceStore();

  // URL 변경 → 탭 업데이트
  useEffect(() => {
    if (!activeTabKey) return;
    
    const activeTab = tabs.find(t => t.key === activeTabKey);
    if (activeTab && activeTab.route !== pathname) {
      // 현재 탭의 route와 history 업데이트
      const currentHistory = Array.isArray(activeTab.history) ? activeTab.history : [];
      updateTab(activeTabKey, {
        route: pathname,
        history: [...currentHistory, pathname]
      });
    }
  }, [pathname, activeTabKey, tabs, updateTab]);

  // 탭 클릭 핸들러 - Tab Content System을 사용하여 상태 보존
  const onTabClick = useCallback((key: string) => {
    const tab = tabs.find(t => t.key === key);
    if (!tab) return;
    
    // 현재 활성 탭과 같은 탭을 클릭한 경우 무시
    if (key === activeTabKey) return;
    
    // 탭 전환 - TabContentManager가 처리
    setActiveTab(key);
    
    // URL 업데이트 (선택적)
    // TabContentManager가 이미 처리하므로 router.push를 사용하지 않음
    // 대신 history.replaceState를 사용하여 URL만 변경
    if (tab.route && typeof window !== 'undefined') {
      window.history.replaceState({}, '', tab.route);
    }
  }, [tabs, activeTabKey, setActiveTab]);

  // 탭 내에서의 네비게이션 (탭 내부 이동)
  const navigateInTab = useCallback((path: string) => {
    if (!activeTabKey) return;
    
    // 현재 탭의 route 업데이트
    updateTab(activeTabKey, {
      route: path,
      history: [...(tabs.find(t => t.key === activeTabKey)?.history || []), path]
    });
    
    // 실제 라우터 이동
    router.push(path);
  }, [activeTabKey, tabs, updateTab, router]);

  return { onTabClick, navigateInTab };
}