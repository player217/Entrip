'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { Icon } from '@entrip/ui'
import { useWorkspaceStore } from '@entrip/shared/client'
import { useTabRouter } from '../../hooks/useTabRouter'
import { routes } from '@/lib/navigation'

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
  { 
    name: '대시보드', 
    href: '/', 
    icon: 'ph:layout-bold'
  },
  { 
    name: '예약관리',
    icon: 'ph:calendar-bold',
    children: [
      { name: '월별 캘린더', href: '/calendar-monthly' },
      { name: '주별 캘린더', href: '/calendar-weekly' },
      { name: '월별 리스트', href: '/list-monthly' },
      { name: '주별 리스트', href: '/list-weekly' }
    ]
  },
  { 
    name: '운영현황', 
    href: '/stats', 
    icon: 'ph:chart-line-bold'
  },
  { 
    name: 'Enformation', 
    href: '/enformation', 
    icon: 'ph:info-bold'
  },
  { 
    name: '결재', 
    href: '/approval', 
    icon: 'ph:check-square-bold'
  },
  { 
    name: '계좌관리', 
    href: '/accounts', 
    icon: 'ph:wallet-bold'
  },
  { 
    name: '메신저', 
    href: '/chat', 
    icon: 'ph:chat-circle-dots-bold'
  },
  { 
    name: '메일', 
    href: '/mail', 
    icon: 'ph:envelope-simple-bold'
  },
  { 
    name: '맞춤설정', 
    href: '/settings', 
    icon: 'ph:gear-six-bold'
  }
]

// Custom hook for localStorage with SSR support
function _useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error reading localStorage key "${key}":`, error)
      }
    }
  }, [key])

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    }
  }

  return [storedValue, setValue]
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed: isCollapsed, toggleSidebar, updateActiveTabContent, tabs: _tabs, activeTabKey, updateTab, addTab } = useWorkspaceStore()
  const [expandedItems, setExpandedItems] = useState<string[]>(['예약관리'])
  const { navigateInTab } = useTabRouter()

  // 일반 링크 클릭 시 현재 탭 업데이트
  const handleNavClick = (e: React.MouseEvent, href: string, name: string, icon: string) => {
    e.preventDefault()
    
    // Direct pages that should NOT use workspace/tab system
    const directPages = ['/calendar-monthly', '/calendar-weekly', '/list-monthly', '/list-weekly', '/stats', '/enformation', '/approval', '/accounts', '/chat', '/mail', '/settings']
    const isDirectPage = directPages.some(page => href.startsWith(page))
    
    if (isDirectPage) {
      // Always use direct navigation for these pages
      router.push(href)
      return
    }
    
    // Only use tab system for workspace-compatible pages
    if (activeTabKey) {
      // 활성 탭 재사용 - navigateInTab을 사용하여 상태 보존
      updateTab(activeTabKey, { 
        label: name, 
        icon, 
        route: href, 
        contentType: undefined 
      })
      navigateInTab(href)
    } else {
      // 첫 탭인 경우
      addTab({ 
        label: name, 
        icon, 
        route: href 
      })
      router.push(href)
    }
  }

  // 경로에서 콘텐츠 타입을 추론하는 함수
  const _getContentTypeFromPath = (path: string): 'flow' | 'calendar' | 'monthlyCalendar' | 'list' | 'empty' => {
    if (path.includes('flow')) return 'flow'
    if (path.includes('calendar')) return 'calendar'
    if (path.includes('list') || path.includes('reservations')) return 'list'
    return 'empty'
  }

  // Remove unused function - now handled by handleNavClick

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isParentActive = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true
    if (item.children) {
      return item.children.some(child => isActive(child.href))
    }
    return false
  }

  return (
    <aside className={clsx(
      'relative z-20 shrink-0 bg-[#016B9F] text-white flex flex-col transition-all duration-300 ease-in-out pt-4',
      'h-full', // 부모 컨테이너 높이 상속
      isCollapsed ? 'w-16' : 'w-64', // w-60 -> w-64로 조정
      className
    )}>
      {/* 네비게이션 메뉴 - 적절한 스크롤 정책 적용 */}
      <nav className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent min-h-0">
        {navigation.map((item) => {
          const isExpanded = expandedItems.includes(item.name)
          const isItemActive = isParentActive(item)

          if (item.children) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 flex items-center justify-between group transition-all duration-200',
                    isItemActive 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon icon={item.icon} className={clsx(
                      'w-5 h-5',
                      isItemActive ? 'text-brand-500' : 'text-white/70'
                    )} />
                    {!isCollapsed && <span className={clsx(
                      "text-lg font-medium",
                      isItemActive ? 'text-white font-semibold' : 'text-white/80'
                    )}>{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <Icon 
                      icon="ph:caret-down-bold" 
                      className={clsx(
                        'w-4 h-4 text-white/60 transition-transform duration-200',
                        !isExpanded && '-rotate-90'
                      )}
                    />
                  )}
                </button>
                {!isCollapsed && isExpanded && (
                  <div className="mt-0.5">
                    {item.children.map(child => (
                      <a
                        key={child.href}
                        href={child.href!}
                        onClick={(e) => handleNavClick(e, child.href!, child.name, child.icon || item.icon)}
                        className={clsx(
                          'block px-4 py-2 pl-12 text-base transition-all duration-200 cursor-pointer',
                          isActive(child.href)
                            ? 'bg-white/10 text-white font-semibold border-l-2 border-brand-500 ml-4'
                            : 'text-white/60 hover:bg-white/5 hover:text-white/80 font-medium'
                        )}
                      >
                        {child.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <a
              key={item.name}
              href={item.href!}
              onClick={(e) => handleNavClick(e, item.href!, item.name, item.icon)}
              className={clsx(
                'px-4 py-2.5 flex items-center justify-between group transition-all duration-200 cursor-pointer',
                isItemActive
                  ? 'bg-white/10 border-l-2 border-brand-500 ml-2'
                  : 'hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon icon={item.icon} className={clsx(
                  'w-5 h-5',
                  isItemActive ? 'text-brand-500' : 'text-white/70'
                )} />
                {!isCollapsed && <span className={clsx(
                  "text-lg font-medium",
                  isItemActive ? 'text-white font-semibold' : 'text-white/80'
                )}>{item.name}</span>}
              </div>
              {!isCollapsed && item.badge && (
                <span className="bg-brand-500 text-white px-2 py-0.5 text-xs font-semibold rounded">
                  {item.badge}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* 하단 메뉴 - 사이드바 닫기만 */}
      <div className="mt-auto p-4 border-t border-white/10 bg-[#016B9F] flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full px-4 py-2.5 flex items-center justify-center gap-3 hover:bg-white/5 transition-all duration-200"
        >
          <Icon icon={isCollapsed ? "ph:sidebar-simple-bold" : "ph:x-bold"} className="w-5 h-5 text-white/70" />
          {!isCollapsed && <span className="text-base text-white/80">사이드바 닫기</span>}
        </button>
      </div>
    </aside>
  )
}
