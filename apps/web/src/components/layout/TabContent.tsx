'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkspaceStore } from '@entrip/shared/client';
import { WorkspaceTabContext } from '@/components/workspace/WorkspaceTabContext';
import { useTabRouter } from '@/hooks/useTabRouter';

const pages: Record<string, React.ComponentType> = {
  '/': dynamic(() => import('../pages/DashboardPageContent'), { ssr: false }),
  '/dashboard': dynamic(() => import('../pages/DashboardPageContent'), { ssr: false }),
  '/calendar-monthly': dynamic(() => import('../../../app/(main)/calendar-monthly/page'), { ssr: false }),
  '/calendar-weekly': dynamic(() => import('../../../app/(main)/calendar-weekly/page'), { ssr: false }),
  '/list-monthly': dynamic(() => import('../../../app/(main)/list-monthly/page'), { ssr: false }),
  '/list-weekly': dynamic(() => import('../../../app/(main)/list-weekly/page'), { ssr: false }),
  '/approval': dynamic(() => import('../../../app/(main)/approval/page'), { ssr: false }),
  '/accounts': dynamic(() => import('../../../app/(main)/accounts/page'), { ssr: false }),
  '/stats': dynamic(() => import('../../../app/(main)/stats/page'), { ssr: false }),
  '/settings': dynamic(() => import('../../../app/(main)/settings/page'), { ssr: false }),
  '/mail': dynamic(() => import('../../../app/(main)/mail/page'), { ssr: false }),
  '/chat': dynamic(() => import('../../../app/(main)/chat/page'), { ssr: false }),
  '/flow': dynamic(() => import('../../../app/(main)/flow/page'), { ssr: false }),
  '/calendar-performance': dynamic(() => import('../../../app/(main)/calendar-performance/page'), { ssr: false }),
  '/flight-schedule': dynamic(() => import('../../../app/(main)/flight-schedule/page'), { ssr: false }),
};

function EmptyWorkspace() {
  const { navigateInTab } = useTabRouter();
  return <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
    <h1 className="text-2xl font-semibold text-gray-800">새 작업</h1>
    <p className="text-sm text-gray-500">사이드바에서 메뉴를 선택하세요. 다른 탭의 작업은 그대로 유지됩니다.</p>
    <div className="flex flex-wrap justify-center gap-3">
      <button className="rounded-lg border px-4 py-3 hover:bg-blue-50" onClick={() => navigateInTab('/calendar-monthly')}>예약관리</button>
      <button className="rounded-lg border px-4 py-3 hover:bg-blue-50" onClick={() => navigateInTab('/accounts')}>계좌관리</button>
      <button className="rounded-lg border px-4 py-3 hover:bg-blue-50" onClick={() => navigateInTab('/approval')}>결재</button>
    </div>
  </div>;
}

interface TabContentProps {
  tabKey: string;
  route: string;
  visible: boolean;
  fallback?: React.ReactNode;
}

export function TabContent({ tabKey, route, visible, fallback }: TabContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(visible);
  useEffect(() => { if (visible) setLoaded(true); }, [visible]);
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !visible) return;
    const position = useWorkspaceStore.getState().tabs.find(tab => tab.key === tabKey)?.state?.scrollPosition;
    if (typeof position === 'number') element.scrollTop = position;
  }, [tabKey, visible]);
  const path = route.split('?')[0] ?? route;
  const Component = pages[path];
  return <div ref={containerRef} role="tabpanel" id={`pane-${tabKey}`} aria-labelledby={`tab-${tabKey}`} hidden={!visible}
    className="h-full min-w-0 overflow-auto p-3 sm:p-6" style={{ display: visible ? 'block' : 'none' }} data-tab-key={tabKey}
    onScroll={event => useWorkspaceStore.getState().updateTabState(tabKey, { scrollPosition: event.currentTarget.scrollTop })}>
    {(loaded || visible) && <WorkspaceTabContext.Provider value={{ tabKey, active: visible }}>
      {Component ? <Component key={route} /> : path === '/workspace' ? <EmptyWorkspace /> : visible ? fallback : null}
    </WorkspaceTabContext.Provider>}
  </div>;
}
