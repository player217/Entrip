'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@entrip/shared/client';
import { workspaceRouteInfo } from '@/lib/workspace-routes';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';

export function useTabRouter() {
  const router = useRouter();
  const paneKey = useWorkspaceTabKey();
  const onTabClick = useCallback((key: string) => {
    const store = useWorkspaceStore.getState();
    const tab = store.tabs.find(item => item.key === key);
    if (!tab || key === store.activeTabKey) return;
    store.setActiveTab(key);
    router.push(tab.route, { scroll: false });
  }, [router]);

  const navigateInTab = useCallback((path: string) => {
    const store = useWorkspaceStore.getState();
    const tab = store.tabs.find(item => item.key === (paneKey ?? store.activeTabKey));
    if (!tab) return;
    if (tab.route !== path) {
      if (tab.state?.isDirty && !window.confirm('저장하지 않은 변경 내용이 있습니다. 이 작업을 이동하시겠습니까?')) return;
      store.updateTab(tab.key, { route: path, ...workspaceRouteInfo(path), state: {}, history: [...tab.history, path].slice(-50) });
    }
    if (tab.key === store.activeTabKey) router.push(path, { scroll: false });
  }, [paneKey, router]);

  const openInNewTab = useCallback((path = '/workspace') => {
    const store = useWorkspaceStore.getState();
    if (store.tabs.length >= 10) return;
    store.addTab({ route: path, ...workspaceRouteInfo(path) });
    router.push(path, { scroll: false });
  }, [router]);
  return { onTabClick, navigateInTab, openInNewTab };
}
