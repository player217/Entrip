'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWorkspaceStore } from '@entrip/shared/client';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';

/** A mounted pane always writes to its own tab, including while another tab is active. */
export function useTabState<T>(initialState: T, stateKey = 'componentState') {
  const contextKey = useWorkspaceTabKey();
  const activeKey = useWorkspaceStore(state => state.activeTabKey);
  const tabKey = contextKey ?? activeKey;
  const saved = useWorkspaceStore(state => state.tabs.find(tab => tab.key === tabKey)?.state?.[stateKey]);
  const [fallback, setFallback] = useState(initialState);
  const value = saved === undefined ? initialState : saved as T;
  const setState = useCallback((next: T | ((previous: T) => T)) => {
    const store = useWorkspaceStore.getState();
    const previous = store.tabs.find(tab => tab.key === tabKey)?.state?.[stateKey];
    const resolved = typeof next === 'function'
      ? (next as (previous: T) => T)(previous === undefined ? initialState : previous as T)
      : next;
    if (tabKey) store.updateTabState(tabKey, { [stateKey]: resolved });
    else setFallback(resolved);
  }, [initialState, stateKey, tabKey]);
  return [tabKey ? value : fallback, setState] as const;
}

export function useTabScroll(elementRef: React.RefObject<HTMLElement>) {
  const contextKey = useWorkspaceTabKey();
  const activeKey = useWorkspaceStore(state => state.activeTabKey);
  const tabKey = contextKey ?? activeKey;
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !tabKey) return;
    const saved = useWorkspaceStore.getState().tabs.find(tab => tab.key === tabKey)?.state?.scrollPosition;
    element.scrollTop = typeof saved === 'number' ? saved : 0;
    const onScroll = () => useWorkspaceStore.getState().updateTabState(tabKey, { scrollPosition: element.scrollTop });
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [elementRef, tabKey]);
}

export function useTabForm<T extends Record<string, unknown>>(initialValues: T) {
  const [formData, setFormData] = useTabState(initialValues);
  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormData(previous => ({ ...previous, [field]: value }));
  }, [setFormData]);
  const resetForm = useCallback(() => setFormData(initialValues), [initialValues, setFormData]);
  return { formData, updateField, resetForm, setFormData };
}
