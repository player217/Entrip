'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Icon } from '@entrip/ui';
import { useWorkspaceStore } from '@entrip/shared/client';
import { useTabRouter } from '@/hooks/useTabRouter';

interface NavItem { name: string; href?: string; icon: string; children?: { name: string; href: string }[] }
const navigation: NavItem[] = [
  { name: '대시보드', href: '/', icon: 'ph:layout-bold' },
  { name: '예약관리', icon: 'ph:calendar-bold', children: [
    { name: '월별 캘린더', href: '/calendar-monthly' }, { name: '주별 캘린더', href: '/calendar-weekly' },
    { name: '월별 리스트', href: '/list-monthly' }, { name: '주별 리스트', href: '/list-weekly' },
  ] },
  { name: '운영현황', href: '/stats', icon: 'ph:chart-line-bold' },
  { name: '항공편 조회', href: '/flight-schedule', icon: 'ph:airplane-takeoff-bold' },
  { name: '결재', href: '/approval', icon: 'ph:check-square-bold' },
  { name: '계좌관리', href: '/accounts', icon: 'ph:wallet-bold' },
  { name: '메신저', href: '/chat', icon: 'ph:chat-circle-dots-bold' },
  { name: '메일', href: '/mail', icon: 'ph:envelope-simple-bold' },
  { name: '맞춤설정', href: '/settings', icon: 'ph:gear-six-bold' },
];

export function Sidebar({ className = '', mobileOpen = false, onNavigate }: { className?: string; mobileOpen?: boolean; onNavigate?: () => void }) {
  const { sidebarCollapsed, toggleSidebar, tabs, activeTabKey } = useWorkspaceStore();
  const { navigateInTab, openInNewTab } = useTabRouter();
  const [expanded, setExpanded] = useState(true);
  const route = tabs.find(tab => tab.key === activeTabKey)?.route.split('?')[0] ?? '/';
  const collapsed = sidebarCollapsed && !mobileOpen;
  const navigate = (event: React.MouseEvent, href: string) => {
    if (event.ctrlKey || event.metaKey) openInNewTab(href);
    else navigateInTab(href);
    onNavigate?.();
  };
  return <aside aria-label="주 메뉴" className={clsx('z-40 flex shrink-0 flex-col overflow-hidden bg-[#016B9F] text-white transition-[width] duration-200', mobileOpen ? 'absolute inset-y-0 left-0 w-60 shadow-xl md:relative' : 'hidden md:flex', collapsed ? 'w-16' : 'w-60', className)}>
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 px-3">
      {!collapsed && <span className="text-xs font-semibold tracking-wider text-white/70">WORKSPACE</span>}
      <button className="rounded p-1 hover:bg-white/10" onClick={toggleSidebar} aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}><Icon icon={collapsed ? 'ph:caret-right' : 'ph:caret-left'} className="h-4 w-4" /></button>
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3"><ul className="space-y-1">
      {navigation.map(item => <li key={item.name}>
        <button title={item.name} aria-label={item.name} aria-expanded={item.children ? expanded && !collapsed : undefined}
          aria-current={item.href === route ? 'page' : undefined}
          className={clsx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm', item.href === route || item.children?.some(child => child.href === route) ? 'bg-white/15' : 'hover:bg-white/10')}
          onClick={event => { if (item.children) { if (collapsed) toggleSidebar(); else setExpanded(value => !value); } else if (item.href) navigate(event, item.href); }}>
          <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
          {!collapsed && <><span className="flex-1">{item.name}</span>{item.children && <Icon icon={expanded ? 'ph:caret-up' : 'ph:caret-down'} className="h-4 w-4" />}</>}
        </button>
        {item.children && expanded && !collapsed && <ul className="ml-5 mt-1 space-y-1 border-l border-white/15 pl-2">{item.children.map(child => <li key={child.href}><button
          className={clsx('w-full rounded-md px-3 py-2 text-left text-sm', child.href === route ? 'bg-white/20' : 'text-white/80 hover:bg-white/10')}
          aria-current={child.href === route ? 'page' : undefined} onClick={event => navigate(event, child.href)}>{child.name}</button></li>)}</ul>}
      </li>)}
    </ul></nav>
    {!collapsed && <p className="border-t border-white/10 p-3 text-[11px] leading-relaxed text-white/60">Ctrl / ⌘ + 메뉴 클릭: 새 작업 탭<br />Alt + 방향키: 탭 순서 변경</p>}
  </aside>;
}
