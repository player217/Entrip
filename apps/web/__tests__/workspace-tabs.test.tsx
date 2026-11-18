import React from 'react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useWorkspaceStore } from '../../../packages/shared/src/stores/workspaceStore';
import { WorkspaceTabs } from '../src/components/workspace/WorkspaceTabs';
import { WorkspaceTabContext } from '../src/components/workspace/WorkspaceTabContext';
import { useTabState } from '../src/hooks/useTabState';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@entrip/ui', () => ({ Icon: () => <span /> }));
jest.mock('@entrip/shared/client', () => ({
  useWorkspaceStore: require('../../../packages/shared/src/stores/workspaceStore').useWorkspaceStore,
}));

beforeEach(() => {
  push.mockClear();
  localStorage.clear();
  useWorkspaceStore.setState({ ownerId: 'company:user', activeTabKey: 'booking', tabs: [
    { key: 'booking', label: '예약관리', icon: '', route: '/calendar-monthly', history: [], state: { isDirty: true } },
    { key: 'account', label: '계좌관리', icon: '', route: '/accounts', history: [] },
  ] });
});

test('cancelling dirty close keeps the pane and its draft', () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<WorkspaceTabs />);
  fireEvent.click(screen.getByRole('button', { name: '예약관리 탭 닫기' }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(useWorkspaceStore.getState().tabs).toHaveLength(2);
  confirm.mockRestore();
});

test('switching panes preserves a dirty draft and keyboard reorder keeps active identity', () => {
  render(<WorkspaceTabs />);
  fireEvent.click(screen.getByRole('tab', { name: '계좌관리' }));
  expect(useWorkspaceStore.getState().activeTabKey).toBe('account');
  expect(useWorkspaceStore.getState().tabs[0]?.state?.isDirty).toBe(true);
  fireEvent.keyDown(screen.getByRole('tab', { name: '계좌관리' }), { key: 'ArrowLeft', altKey: true });
  expect(useWorkspaceStore.getState().tabs.map(tab => tab.key)).toEqual(['account', 'booking']);
  expect(useWorkspaceStore.getState().activeTabKey).toBe('account');
});

test('a hidden mounted pane keeps its own state writer after another pane becomes active', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <WorkspaceTabContext.Provider value={{ tabKey: 'booking', active: false }}>{children}</WorkspaceTabContext.Provider>;
  const { result } = renderHook(() => useTabState({ name: '' }, 'bookingDraft'), { wrapper });
  act(() => useWorkspaceStore.getState().setActiveTab('account'));
  act(() => result.current[1]({ name: '예약 초안' }));
  expect(useWorkspaceStore.getState().tabs.find(tab => tab.key === 'booking')?.state?.bookingDraft).toEqual({ name: '예약 초안' });
  expect(useWorkspaceStore.getState().tabs.find(tab => tab.key === 'account')?.state?.bookingDraft).toBeUndefined();
});

test('the tenth active tab stays fully visible, and selecting the first scrolls back without losing drafts', () => {
  const tabs = Array.from({ length: 10 }, (_, index) => ({
    key: `task-${index}`, label: `작업 ${index + 1}`, icon: '', route: '/workspace', history: [], state: { draft: `초안 ${index + 1}` },
  }));
  useWorkspaceStore.setState({ tabs, activeTabKey: 'task-9' });
  const geometry = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'tablist') return { left: 0, right: 780, width: 780 } as DOMRect;
    if (this.parentElement?.getAttribute('role') === 'tablist') {
      const index = Array.from(this.parentElement.children).indexOf(this);
      const left = index * 130 - this.parentElement.scrollLeft;
      return { left, right: left + 130, width: 130 } as DOMRect;
    }
    return { left: 0, right: 0, width: 0 } as DOMRect;
  });
  try {
    render(<WorkspaceTabs />);
    const strip = screen.getByRole('tablist');
    expect(strip.scrollLeft).toBe(520);
    const lastTab = screen.getByRole('tab', { name: '작업 10' }).parentElement!;
    expect(lastTab.getBoundingClientRect().right).toBeLessThanOrEqual(strip.getBoundingClientRect().right);
    expect(screen.getByRole('button', { name: '새 작업 탭' })).toBeDisabled();
    expect(screen.getByText('최대 10개')).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: '작업 1' }));
    expect(strip.scrollLeft).toBe(0);
    expect(useWorkspaceStore.getState().tabs[9]?.state?.draft).toBe('초안 10');
    fireEvent.keyDown(screen.getByRole('tab', { name: '작업 1' }), { key: 'ArrowRight', altKey: true });
    expect(useWorkspaceStore.getState().activeTabKey).toBe('task-0');
    expect(useWorkspaceStore.getState().tabs[1]?.key).toBe('task-0');
  } finally {
    geometry.mockRestore();
  }
});
