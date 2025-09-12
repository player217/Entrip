'use client';
import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Icon } from '../../primitives/Icon';

export interface ChromeTab {
  key: string;
  label: string;
  icon: string;
  content: ReactNode;
  closable?: boolean;
}

export interface ChromeTabContainerProps {
  tabs: ChromeTab[];
  activeKey: string | null;
  onTabChange: (key: string) => void;
  onNewTab: () => void;
  onCloseTab: (key: string) => void;
  hideContent?: boolean;
}

export function ChromeTabContainer({ 
  tabs, 
  activeKey, 
  onTabChange, 
  onNewTab, 
  onCloseTab,
  hideContent = false 
}: ChromeTabContainerProps) {
  if (!tabs.length) return null;

  return (
    <>
      {/* Chrome 스타일 탭 바 */}
      <div className="flex items-end h-9 pl-1">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={clsx(
              'chrome-tab group flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] h-9 cursor-pointer transition-all duration-150 mr-[-1px]',
              'border-t border-l border-r rounded-t-md',
              activeKey === tab.key
                ? 'bg-white border-gray-300 z-10 shadow-sm' 
                : 'bg-[rgba(1,107,159,0.7)] border-[rgba(255,255,255,0.2)] hover:bg-[rgba(1,107,159,0.85)] text-white/80'
            )}
          >
            <Icon icon={tab.icon} className={clsx(
              "w-4 h-4 flex-shrink-0",
              activeKey === tab.key ? "text-gray-600" : "text-white/70"
            )} />
            <span className={clsx(
              "text-[13px] font-medium truncate flex-1",
              activeKey === tab.key ? "text-gray-900" : "text-white/90"
            )}>{tab.label}</span>
            {tab.closable !== false && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onCloseTab(tab.key); 
                }}
                className={clsx(
                  "p-0.5 rounded hover:bg-black/10 transition-opacity",
                  activeKey === tab.key ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <Icon icon="ph:x" className={clsx(
                  "w-3 h-3",
                  activeKey === tab.key ? "text-gray-500 hover:text-red-500" : "text-white/70"
                )} />
              </button>
            )}
          </div>
        ))}
        <button 
          onClick={onNewTab}
          className="ml-1 p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          title="새 탭 추가"
        >
          <Icon icon="ph:plus" className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* 2. 콘텐츠 영역 - hideContent가 true일 때 숨김 */}
      {!hideContent && (
        <>
          {tabs.find(t => t.key === activeKey)?.content || (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-lg">사이드바에서 작업할 메뉴를 선택하세요.</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
