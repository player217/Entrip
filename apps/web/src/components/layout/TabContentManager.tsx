'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspaceStore } from '@entrip/shared/client';
import { TabContent } from './TabContent';
import { workspaceRouteInfo } from '@/lib/workspace-routes';

export function TabContentManager({ children }: { children?: React.ReactNode }) {
  const tabs = useWorkspaceStore(state => state.tabs);
  const activeTabKey = useWorkspaceStore(state => state.activeTabKey);
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  useEffect(() => {
    // Only a URL change may retarget a pane. A tab switch must not copy the old URL into the new tab.
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    const store = useWorkspaceStore.getState();
    const tab = store.tabs.find(item => item.key === store.activeTabKey);
    if (tab && tab.route.split('?')[0] !== pathname) {
      store.updateTab(tab.key, { route: pathname, ...workspaceRouteInfo(pathname), state: {}, history: [...tab.history, pathname].slice(-50) });
    }
  }, [pathname]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (useWorkspaceStore.getState().tabs.some(tab => tab.state?.isDirty)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  return <div className="entrip-panes relative h-full min-w-0">
    {tabs.map(tab => <TabContent key={tab.key} tabKey={tab.key} route={tab.route} visible={tab.key === activeTabKey} fallback={children} />)}
  </div>;
}
