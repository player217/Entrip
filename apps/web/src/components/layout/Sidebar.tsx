'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Icon } from '@entrip/ui'
import { useSidebarHeight } from '@/hooks/useViewportHeight'

interface NavItem {
  name: string
  href?: string
  icon: string
  badge?: string
  children?: {
    name: string
    href?: string
    icon?: string
  }[]
}

const navigation: NavItem[] = [
  { name: '대시보드', href: '/', icon: 'ph:layout-bold' },
  {
    name: '예약관리',
    icon: 'ph:calendar-bold',
    children: [
      { name: '월별 캘린더', href: '/calendar-monthly' },
      { name: '주별 캘린더', href: '/calendar-weekly' },
      { name: '월별 리스트', href: '/list-monthly' },
      { name: '주별 리스트', href: '/list-weekly' },
    ],
  },
  { name: '운영현황', href: '/stats', icon: 'ph:chart-line-bold' },
  { name: 'Enformation', href: '/enformation', icon: 'ph:info-bold' },
  { name: '결재', href: '/approval', icon: 'ph:check-square-bold' },
  { name: '계좌관리', href: '/accounts', icon: 'ph:wallet-bold' },
  { name: '메신저', href: '/chat', icon: 'ph:chat-circle-dots-bold' },
  { name: '메일', href: '/mail', icon: 'ph:envelope-simple-bold' },
  { name: '맞춤설정', href: '/settings', icon: 'ph:gear-six-bold' },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { cssHeight } = useSidebarHeight()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['예약관리'])

  // persist collapse state locally
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored) setIsCollapsed(stored === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName) ? prev.filter((name) => name !== itemName) : [...prev, itemName]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isParentActive = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true
    if (item.children) return item.children.some((child) => isActive(child.href))
    return false
  }

  const handleNavClick = (href?: string) => {
    if (!href) return
    router.push(href)
  }

  return (
    <aside
      className={clsx(
        'relative z-20 shrink-0 bg-[#016B9F] text-white flex flex-col transition-all duration-300 ease-in-out h-auto overflow-hidden',
        'min-h-0',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
      style={{ maxHeight: cssHeight }}
    >
      {/* Collapse toggle */}
      <button
        className="absolute -right-3 top-4 w-6 h-6 rounded-full bg-white/80 text-brand-700 shadow-md flex items-center justify-center text-xs"
        onClick={() => setIsCollapsed((v) => !v)}
        aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
      >
        {isCollapsed ? '>' : '<'}
      </button>

      {/* Shortcut bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 text-xs uppercase tracking-wide">
        <span className="font-semibold text-white/80">Workspaces</span>
        <div className="flex gap-2 ml-auto text-white/70">
          <span className="flex items-center gap-1"><Icon icon="ph:calendar" className="w-4 h-4" />CAL</span>
          <span className="flex items-center gap-1"><Icon icon="ph:list" className="w-4 h-4" />LIST</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <div
                className={clsx(
                  'flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors',
                  isParentActive(item) ? 'bg-white/15' : 'hover:bg-white/10'
                )}
                onClick={() =>
                  item.children ? toggleExpanded(item.name) : handleNavClick(item.href)
                }
              >
                <Icon icon={item.icon} className="w-5 h-5 mr-2" />
                {!isCollapsed && <span className="flex-1 text-sm font-medium">{item.name}</span>}
                {item.children && !isCollapsed && (
                  <Icon
                    icon={expandedItems.includes(item.name) ? 'ph:caret-up' : 'ph:caret-down'}
                    className="w-4 h-4 text-white/70"
                  />
                )}
              </div>
              {item.children && expandedItems.includes(item.name) && !isCollapsed && (
                <ul className="mt-1 ml-4 space-y-1">
                  {item.children.map((child) => (
                    <li key={child.name}>
                      <div
                        className={clsx(
                          'flex items-center px-3 py-2 cursor-pointer rounded-md transition-colors text-sm',
                          isActive(child.href) ? 'bg-white/20' : 'hover:bg-white/10'
                        )}
                        onClick={() => handleNavClick(child.href)}
                      >
                        <span className="mr-2 text-white/70">•</span>
                        <span>{child.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
