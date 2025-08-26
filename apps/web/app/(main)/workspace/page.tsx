'use client';
import { useWorkspaceStore } from '@entrip/shared/client';
import { FlowCanvas } from '../flow/FlowCanvas';
import { CalendarMonth } from '@entrip/ui';
import MonthlyCalendarView from '../../../src/features/calendar/MonthlyCalendarView';
import MonthlyListPage from '../../../src/features/calendar/MonthlyListPage';
import WeeklyListPage from '../../../src/features/calendar/WeeklyListPage';
import CalendarWeekPage from '../../../src/app/(main)/calendar-week/page';

// 콘텐츠 타입을 실제 컴포넌트로 매핑
const contentMap: Record<string, JSX.Element> = {
  flow: <FlowCanvas />,
  calendar: <CalendarWeekPage />,
  monthlyCalendar: <MonthlyCalendarView />,
  list: <WeeklyListPage />,
  monthlyList: <MonthlyListPage />,
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
  
  // Version tracking
  console.log('📅 WorkSpace Page loaded - Version: 2025-01-22-v2, using WeekView component');

  // 현재 활성 탭의 콘텐츠 찾기
  const activeTab = tabs.find(tab => tab.key === activeTabKey);
  const activeContent = activeTab && activeTab.contentType
    ? contentMap[activeTab.contentType] || contentMap.empty 
    : contentMap.empty;

  return (
    <div className="h-full w-full">
      {activeContent}
    </div>
  );
}