import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../lib/logger';

// 탭이 표시할 콘텐츠 타입을 정의
export type WorkspaceContentType = 'flow' | 'calendar' | 'monthlyCalendar' | 'list' | 'empty';

export interface WorkspaceTab {
  key: string;
  label: string;
  icon: string;
  route: string; // 현재 URL
  history: string[]; // 탭 내부 이동 히스토리
  contentType?: WorkspaceContentType; // workspace 전용일 때만 사용
  closable?: boolean;
  // 탭별 상태 보존을 위한 새로운 필드들
  state?: any; // 탭별 상태 데이터 (폼 데이터, 필터 등)
  scrollPosition?: number; // 스크롤 위치
  isLoaded?: boolean; // 콘텐츠 로드 여부
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabKey: string | null;
  sidebarCollapsed: boolean;
  addTab: (customTab?: Partial<WorkspaceTab>) => void;
  closeTab: (key: string) => void;
  setActiveTab: (key: string) => void;
  updateTab: (key: string, patch: Partial<WorkspaceTab>) => void;
  updateActiveTabContent: (contentType: WorkspaceContentType, label?: string, icon?: string) => void;
  updateTabState: (key: string, state: any) => void; // 탭 상태 업데이트
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
  tabs: [
    { 
      key: 'tab-1', 
      label: 'New Tab', 
      icon: 'ph:globe-bold', 
      route: '/',
      history: ['/'],
      contentType: 'empty',
      closable: true
    }
  ],
  activeTabKey: 'tab-1',
  sidebarCollapsed: false,

  addTab: (customTab?: Partial<WorkspaceTab>) => {
    try {
      // 탭 10개 제한
      if (get().tabs.length >= 10) {
        logger.warn('WorkspaceStore', 'Maximum tab limit reached (10)');
        return;
      }
      
      const newTabKey = customTab?.key || `tab-${Date.now()}`;
      const route = customTab?.route || '/';
      const newTab: WorkspaceTab = {
        key: newTabKey,
        label: customTab?.label || `Untitled-${get().tabs.length + 1}`,
        icon: customTab?.icon || 'ph:file-bold',
        route: route,
        history: [route],
        contentType: customTab?.contentType || 'empty',
        closable: customTab?.closable !== false,
        ...customTab
      };
      
      logger.info('WorkspaceStore', 'Adding new tab', { newTab });
      
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabKey: newTabKey
      }));
    } catch (error) {
      logger.error('WorkspaceStore', 'Failed to add tab', error);
    }
  },

  closeTab: (key: string) => {
    set((state) => {
      // closable이 false인 탭은 닫을 수 없음
      const tabToClose = state.tabs.find(tab => tab.key === key);
      if (tabToClose && tabToClose.closable === false) {
        return state;
      }
      
      const newTabs = state.tabs.filter(tab => tab.key !== key);
      
      // 마지막 탭을 닫으려 할 때 새 탭 생성
      if (newTabs.length === 0) {
        const newTab: WorkspaceTab = {
          key: `tab-${Date.now()}`,
          label: 'New Tab',
          icon: 'ph:globe-bold',
          route: '/',
          history: ['/'],
          contentType: 'empty',
          closable: true
        };
        return {
          tabs: [newTab],
          activeTabKey: newTab.key
        };
      }
      
      // 닫은 탭이 활성 탭이었다면 마지막 탭을 활성화
      let newActiveKey = state.activeTabKey;
      if (state.activeTabKey === key) {
        newActiveKey = newTabs[newTabs.length - 1]?.key ?? null;
      }
      return {
        tabs: newTabs,
        activeTabKey: newActiveKey
      };
    });
  },

  setActiveTab: (key: string) => {
    set({ activeTabKey: key });
  },

  updateTab: (key: string, patch: Partial<WorkspaceTab>) => {
    set((state) => ({
      tabs: state.tabs.map(tab => 
        tab.key === key 
          ? { ...tab, ...patch }
          : tab
      )
    }));
  },

  updateActiveTabContent: (contentType: WorkspaceContentType, label?: string, icon?: string) => {
    set((state) => {
      const activeTab = state.tabs.find(tab => tab.key === state.activeTabKey);
      if (!activeTab) return state;

      const updatedTabs = state.tabs.map(tab => {
        if (tab.key === state.activeTabKey) {
          return {
            ...tab,
            contentType,
            label: label || getDefaultLabel(contentType),
            icon: icon || getDefaultIcon(contentType)
          };
        }
        return tab;
      });

      return { tabs: updatedTabs };
    });
  },

  updateTabState: (key: string, state: any) => {
    set((store) => ({
      tabs: store.tabs.map(tab => 
        tab.key === key 
          ? { ...tab, state: { ...tab.state, ...state } }
          : tab
      )
    }));
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  }
    }),
    {
      name: 'workspace-storage', // localStorage key
      partialize: (state) => ({ tabs: state.tabs, activeTabKey: state.activeTabKey, sidebarCollapsed: state.sidebarCollapsed }), // Persist tabs, activeTabKey, and sidebarCollapsed
    }
  )
);

// 콘텐츠 타입별 기본 라벨
function getDefaultLabel(contentType: WorkspaceContentType): string {
  const labels = {
    flow: 'Flow Editor',
    calendar: '주별 캘린더',
    monthlyCalendar: '월별 캘린더',
    list: '예약 목록',
    empty: 'New Tab'
  };
  return labels[contentType] || 'New Tab';
}

// 콘텐츠 타입별 기본 아이콘
function getDefaultIcon(contentType: WorkspaceContentType): string {
  const icons = {
    flow: 'ph:flow-arrow-bold',
    calendar: 'ph:calendar-bold',
    monthlyCalendar: 'ph:calendar-blank-bold',
    list: 'ph:list-bold',
    empty: 'ph:globe-bold'
  };
  return icons[contentType] || 'ph:globe-bold';
}