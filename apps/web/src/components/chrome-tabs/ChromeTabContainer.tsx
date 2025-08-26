'use client';

import { useState, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Icon } from '@entrip/ui';

export interface ChromeTab {
  key: string;
  label: string;
  icon: string;
  content: ReactNode;
}

export interface ChromeTabContainerProps {
  tabs: ChromeTab[];
  initialKey?: string;
}

export function ChromeTabContainer({ tabs, initialKey }: ChromeTabContainerProps) {
  const [activeTab, setActiveTab] = useState(initialKey ?? tabs[0]?.key);

  return (
    <div className="flex flex-col h-full">
      {/* 1. 탭 바 영역 */}
      <div className="flex items-end -mb-px pl-2 pt-2">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 border-t border-l border-r rounded-t-lg cursor-pointer transition-colors duration-150',
              activeTab === tab.key
                ? 'bg-white border-gray-200 z-10' // 활성 탭
                : 'bg-gray-100 border-transparent hover:bg-gray-200'
            )}
          >
            <Icon icon={tab.icon} className="w-5 h-5 text-gray-700" />
            <span className="text-base font-medium text-gray-800">{tab.label}</span>
          </div>
        ))}
        <button className="p-2 ml-1 mb-1 rounded-full hover:bg-gray-200 transition-colors">
          <Icon icon="ph:plus-bold" className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 2. 콘텐츠 영역 (활성 탭에 연결된 부분) */}
      <div className="flex-1 bg-white border border-gray-200 rounded-b-lg rounded-tr-lg shadow-md overflow-hidden">
        {tabs.find(t => t.key === activeTab)?.content}
      </div>
    </div>
  );
}
