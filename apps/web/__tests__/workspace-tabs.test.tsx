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
