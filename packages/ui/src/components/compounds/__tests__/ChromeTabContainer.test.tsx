import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChromeTabContainer, ChromeTab } from '../ChromeTabContainer';

describe('ChromeTabContainer', () => {
  const mockTabs: ChromeTab[] = [
    { key: '1', label: '예약 관리', icon: 'ph:calendar', content: <div>예약 관리 내용</div>, closable: true },
    { key: '2', label: '팀 관리', icon: 'ph:users', content: <div>팀 관리 내용</div>, closable: true },
    { key: '3', label: '일정표', icon: 'ph:calendar-blank', content: <div>일정표 내용</div>, closable: false },
  ];

  const mockOnTabChange = jest.fn();
  const mockOnCloseTab = jest.fn();
  const mockOnNewTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all tabs', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    expect(screen.getByText('예약 관리')).toBeInTheDocument();
    expect(screen.getByText('팀 관리')).toBeInTheDocument();
    expect(screen.getByText('일정표')).toBeInTheDocument();
  });

  it('highlights active tab', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    const activeTab = screen.getByText('예약 관리').closest('.chrome-tab');
    const inactiveTab = screen.getByText('팀 관리').closest('.chrome-tab');

    expect(activeTab).toHaveClass('bg-white');
    expect(inactiveTab).toHaveClass('bg-[rgba(1,107,159,0.7)]');
  });

  it('calls onTabChange when clicking a tab', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    const tab = screen.getByText('팀 관리');
    fireEvent.click(tab);

    expect(mockOnTabChange).toHaveBeenCalledWith('2');
  });

  it('calls onCloseTab when clicking close button', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    // Find the second tab and click its close button
    const secondTab = screen.getByText('팀 관리').closest('.chrome-tab');
    const closeButton = secondTab!.querySelector('button');
    fireEvent.click(closeButton!);

    expect(mockOnCloseTab).toHaveBeenCalledWith('2');
  });

  it('renders add tab button', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    const addButton = screen.getByTitle('새 탭 추가');
    expect(addButton).toBeInTheDocument();
  });

  it('calls onNewTab when clicking add button', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
      />
    );

    const addButton = screen.getByTitle('새 탭 추가');
    fireEvent.click(addButton);

    expect(mockOnNewTab).toHaveBeenCalled();
  });

  it('displays tab content when not hidden', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
        hideContent={false}
      />
    );

    expect(screen.getByText('예약 관리 내용')).toBeInTheDocument();
  });

  it('hides tab content when hideContent is true', () => {
    render(
      <ChromeTabContainer
        tabs={mockTabs}
        activeKey="1"
        onTabChange={mockOnTabChange}
        onCloseTab={mockOnCloseTab}
        onNewTab={mockOnNewTab}
        hideContent={true}
      />
    );

    expect(screen.queryByText('예약 관리 내용')).not.toBeInTheDocument();
  });
});