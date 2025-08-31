'use client';
import { useWorkspaceStore } from '@entrip/shared/client';
import { FlowCanvas } from '../flow/FlowCanvas';
import ReservationListView from '@/features/calendar/ReservationListView';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';

// 콘텐츠 타입을 실제 컴포넌트로 매핑
const contentMap: Record<string, JSX.Element> = {
  flow: <FlowCanvas />,
  calendar: <ReservationListView viewType="calendar-week" />,
  monthlyCalendar: <ReservationListView viewType="calendar-month" />,
  list: <ReservationListView viewType="list" />,
  monthlyList: <ReservationListView viewType="list" currentMonth={new Date()} />,
  empty: (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <div className="text-6xl mb-4">🌐</div>
        <p className="text-lg">사이드바에서 작업할 메뉴를 선택하세요.</p>
      </div>
    </div>
  ),
};

export default function WorkSpacePage() {
  const { tabs, activeTabKey } = useWorkspaceStore();
  const { currentContent } = useWorkspaceNavigation();
  
  // Version tracking
  // console.log('📅 WorkSpace Page loaded - Version: 2025-01-22-v3, with URL sync');

  // URL 기반 콘텐츠 또는 탭 기반 콘텐츠 결정
  const activeTab = tabs.find(tab => tab.key === activeTabKey);
  const contentType = currentContent !== 'empty' 
    ? currentContent 
    : (activeTab?.contentType || 'empty');
    
  const activeContent = contentMap[contentType] || contentMap.empty;

  return (
    <div className="h-full w-full">
      {activeContent}
    </div>
  );
}