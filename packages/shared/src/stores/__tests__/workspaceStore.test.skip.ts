import { renderHook, act } from '@testing-library/react';
import { useWorkspaceStore } from '../workspaceStore';

// Set test timeout
jest.setTimeout(10000);

describe('workspaceStore', () => {
  beforeEach(() => {
    // Reset store before each test
    localStorage.clear();
    
    // Reset the store state
    useWorkspaceStore.setState({
      tabs: [{
        key: 'tab-1',
        label: 'New Tab',
        icon: 'ph:globe-bold',
        contentType: 'empty',
        closable: true
      }],
      activeTabKey: 'tab-1'
    });
  });

  describe('Tab Management', () => {
    it('should have initial tab', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0]).toMatchObject({
        key: 'tab-1',
        label: 'New Tab',
        icon: 'ph:globe-bold',
        contentType: 'empty',
        closable: true
      });
      expect(result.current.activeTabKey).toBe('tab-1');
    });

    it('should add a new tab', () => {
      const { result } = renderHook(() => useWorkspaceStore());
      const initialTabCount = result.current.tabs.length;

      act(() => {
        result.current.addTab('flow');
      });

      expect(result.current.tabs).toHaveLength(initialTabCount + 1);
      const newTab = result.current.tabs[result.current.tabs.length - 1];
      expect(newTab.contentType).toBe('flow');
      expect(newTab.key).toContain('tab-');
      expect(result.current.activeTabKey).toBe(newTab.key);
    });

    it('should add tab with custom properties', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      act(() => {
        result.current.addTab('calendar', {
          label: 'My Calendar',
          icon: 'ph:calendar-bold',
          closable: false
        });
      });

      const newTab = result.current.tabs[result.current.tabs.length - 1];
      expect(newTab.label).toBe('My Calendar');
      expect(newTab.icon).toBe('ph:calendar-bold');
      expect(newTab.closable).toBe(false);
    });

    it('should close a tab', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Add a new tab
      act(() => {
        result.current.addTab('list');
      });

      const tabToClose = result.current.tabs[result.current.tabs.length - 1];
      const tabCount = result.current.tabs.length;

      act(() => {
        result.current.closeTab(tabToClose.key);
      });

      expect(result.current.tabs).toHaveLength(tabCount - 1);
      expect(result.current.tabs.find(t => t.key === tabToClose.key)).toBeUndefined();
    });

    it('should not close non-closable tabs', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Add a non-closable tab
      act(() => {
        result.current.addTab('flow', { closable: false });
      });

      const nonClosableTab = result.current.tabs[result.current.tabs.length - 1];
      const tabCount = result.current.tabs.length;

      act(() => {
        result.current.closeTab(nonClosableTab.key);
      });

      expect(result.current.tabs).toHaveLength(tabCount);
      expect(result.current.tabs.find(t => t.key === nonClosableTab.key)).toBeDefined();
    });

    it('should set active tab', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Add multiple tabs
      act(() => {
        result.current.addTab('calendar');
        result.current.addTab('list');
      });

      const firstTab = result.current.tabs[0];

      act(() => {
        result.current.setActiveTab(firstTab.key);
      });

      expect(result.current.activeTabKey).toBe(firstTab.key);
    });

    it('should update active tab content', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      const activeTab = result.current.tabs.find(t => t.key === result.current.activeTabKey);
      expect(activeTab?.contentType).toBe('empty');

      act(() => {
        result.current.updateActiveTabContent('flow', 'Flow View', 'ph:flow-arrow-bold');
      });

      const updatedTab = result.current.tabs.find(t => t.key === result.current.activeTabKey);
      expect(updatedTab?.contentType).toBe('flow');
      expect(updatedTab?.label).toBe('Flow View');
      expect(updatedTab?.icon).toBe('ph:flow-arrow-bold');
    });

    it('should handle closing last tab by creating new one', () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // Close all tabs except the last one
      while (result.current.tabs.length > 1) {
        act(() => {
          result.current.closeTab(result.current.tabs[0].key);
        });
      }

      const lastTab = result.current.tabs[0];

      act(() => {
        result.current.closeTab(lastTab.key);
      });

      // Should still have at least one tab
      expect(result.current.tabs.length).toBeGreaterThan(0);
      expect(result.current.activeTabKey).toBeTruthy();
    });
  });

  describe('Persistence', () => {
    it('should persist state', () => {
      const { result: result1 } = renderHook(() => useWorkspaceStore());

      // Add some tabs
      act(() => {
        result1.current.addTab('calendar', { label: 'Persistent Calendar' });
      });

      // Create new hook instance (simulating page reload)
      const { result: result2 } = renderHook(() => useWorkspaceStore());

      // Should have the persisted tab
      expect(result2.current.tabs.find(t => t.label === 'Persistent Calendar')).toBeDefined();
    });
  });
});