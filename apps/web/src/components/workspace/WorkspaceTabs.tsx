'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@entrip/shared/client';
import { Icon } from '@entrip/ui';
import { useTabRouter } from '@/hooks/useTabRouter';

export function WorkspaceTabs() {
  const { tabs, activeTabKey, closeTab, reorderTab } = useWorkspaceStore();
  const { onTabClick, openInNewTab } = useTabRouter();
  const [dragging, setDragging] = useState<string | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const limitId = useId();
  const tabOrder = tabs.map(tab => tab.key).join(',');

  useLayoutEffect(() => {
    const container = tabListRef.current;
    const activeTab = activeTabRef.current;
    if (!container || !activeTab) return;
    const revealActiveTab = () => {
      const viewport = container.getBoundingClientRect();
      const active = activeTab.getBoundingClientRect();
      // Scroll the tab strip only, and include the close button in the visible area.
      if (active.left < viewport.left) container.scrollLeft += active.left - viewport.left;
      else if (active.right > viewport.right) container.scrollLeft += active.right - viewport.right;
    };
    revealActiveTab();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(revealActiveTab);
    observer.observe(container);
    observer.observe(activeTab);
    return () => observer.disconnect();
  }, [activeTabKey, tabOrder]);
  const close = (key: string) => {
    const tab = useWorkspaceStore.getState().tabs.find(item => item.key === key);
    if (tab?.state?.isDirty && !window.confirm('저장하지 않은 변경 내용이 있습니다. 이 탭을 닫으시겠습니까?')) return;
    const wasActive = useWorkspaceStore.getState().activeTabKey === key;
    closeTab(key);
    if (wasActive) {
      const store = useWorkspaceStore.getState();
      const next = store.tabs.find(item => item.key === store.activeTabKey);
      if (next) window.history.replaceState(window.history.state, '', next.route);
    }
  };
  return <div className="flex h-10 min-w-0 shrink-0 items-end bg-[#e9f2f8] px-1" aria-label="작업 탭 영역">
    <div ref={tabListRef} className="flex min-w-0 flex-1 overflow-x-auto" role="tablist" aria-label="작업 탭">
      {tabs.map((tab, index) => <div key={tab.key} ref={tab.key === activeTabKey ? activeTabRef : undefined} className={`group flex h-9 min-w-[130px] max-w-[220px] flex-1 items-center gap-1 rounded-t-lg border px-2 ${tab.key === activeTabKey ? 'border-gray-200 border-b-white bg-white text-gray-900' : 'border-transparent text-gray-600 hover:bg-white/60'}`}
        draggable onDragStart={event => { setDragging(tab.key); event.dataTransfer.setData('text/plain', tab.key); event.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => setDragging(null)} onDragOver={event => { if (dragging) event.preventDefault(); }}
        onDrop={event => { event.preventDefault(); if (dragging) reorderTab(dragging, index); setDragging(null); }}>
        <button role="tab" id={`tab-${tab.key}`} aria-controls={`pane-${tab.key}`} aria-selected={tab.key === activeTabKey}
          tabIndex={tab.key === activeTabKey ? 0 : -1} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-xs" title={`${tab.label}${tab.state?.isDirty ? ' · 저장 안 됨' : ''}`}
          onClick={() => onTabClick(tab.key)} onKeyDown={event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const nextIndex = Math.max(0, Math.min(index + (event.key === 'ArrowLeft' ? -1 : 1), tabs.length - 1));
            if (event.altKey) reorderTab(tab.key, nextIndex);
            else { const next = tabs[nextIndex]; if (next) { onTabClick(next.key); document.getElementById(`tab-${next.key}`)?.focus({ preventScroll: true }); } }
          }}>
          <Icon icon={tab.icon} className="h-4 w-4 shrink-0" />
          <span className="truncate">{tab.label}</span>
          {Boolean(tab.state?.isDirty) && <span aria-label="저장 안 됨" className="text-orange-500">●</span>}
        </button>
        {tab.closable !== false && <button aria-label={`${tab.label} 탭 닫기`} className="shrink-0 rounded p-1 hover:bg-gray-200" onClick={() => close(tab.key)}><Icon icon="ph:x" className="h-3 w-3" /></button>}
      </div>)}
    </div>
    {tabs.length >= 10 && <span id={limitId} className="mb-2 ml-2 shrink-0 text-xs text-gray-600">최대 10개<span className="sr-only">입니다. 새 작업을 열려면 기존 탭을 닫아 주세요.</span></span>}
    <button onClick={() => openInNewTab()} disabled={tabs.length >= 10} aria-label="새 작업 탭" aria-describedby={tabs.length >= 10 ? limitId : undefined} title={tabs.length >= 10 ? '최대 10개 작업 탭' : '새 작업 탭'} className="mb-1 ml-1 shrink-0 rounded p-2 text-gray-600 hover:bg-white disabled:opacity-40"><Icon icon="ph:plus" className="h-4 w-4" /></button>
  </div>;
}
