import { useWorkspaceStore } from '../workspaceStore';
jest.unmock('zustand/middleware');

const store = () => useWorkspaceStore.getState();
beforeEach(() => {
  localStorage.clear();
  useWorkspaceStore.setState({ ownerId: null, tabs: [], activeTabKey: null, sidebarCollapsed: false });
  store().bindOwner('ENTRIP:user-1');
});

test('a different company or user cannot inherit tab drafts', () => {
  const key = store().activeTabKey!;
  store().updateTabState(key, { accountDraft: { id: 'bank-1', name: 'private' }, isDirty: true });
  store().bindOwner('J1:user-1');
  expect(store().tabs).toHaveLength(1);
  expect(store().tabs[0]?.state).toBeUndefined();
  expect(JSON.parse(localStorage.getItem('workspace-storage')!).state.ownerId).toBe('J1:user-1');
  expect(localStorage.getItem('workspace-storage')).not.toContain('private');
});

test('verifying the same owner keeps drafts and stable pane identities', () => {
  const key = store().activeTabKey!;
  store().updateTabState(key, { bookingDraft: { name: 'draft' }, isDirty: true });
  store().bindOwner('ENTRIP:user-1');
  expect(store().activeTabKey).toBe(key);
  expect(store().tabs[0]?.state?.bookingDraft).toEqual({ name: 'draft' });
});

test('inactive panes update only their own state and reordering preserves it', () => {
  const first = store().activeTabKey!;
  store().addTab({ key: 'second', route: '/accounts' });
  store().updateTabState(first, { bookingDraft: { name: 'first' } });
  store().updateTabState('second', { accountDraft: { name: 'second' }, isDirty: true });
  store().reorderTab('second', 0);
  expect(store().tabs.map(tab => tab.key)).toEqual(['second', first]);
  expect(store().tabs[0]?.state?.accountDraft).toEqual({ name: 'second' });
  expect(store().tabs[1]?.state?.bookingDraft).toEqual({ name: 'first' });
  expect(store().activeTabKey).toBe('second');
});

test('invalid selections and duplicate keys cannot corrupt the active pane', () => {
  const first = store().activeTabKey!;
  store().setActiveTab('missing');
  store().addTab({ key: first });
  expect(store().activeTabKey).toBe(first);
  expect(store().tabs).toHaveLength(1);
});

test('closing the last tab leaves one usable pane', () => {
  store().closeTab(store().activeTabKey!);
  expect(store().tabs).toHaveLength(1);
  expect(store().tabs[0]?.key).toBe(store().activeTabKey);
});
