'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Icon } from '@entrip/ui'
import Image from 'next/image'
import HeaderExchange from './HeaderExchange'
import { useWorkspaceStore } from '@entrip/shared/client'
import { clsx } from 'clsx'
import { useTabRouter } from '../../hooks/useTabRouter'
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  className?: string
  useTabSystem?: boolean
}

export function Header({ className = '' }: HeaderProps) {
  const logoRef = useRef<HTMLDivElement>(null)
  const iconsRef = useRef<HTMLDivElement>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const [leftOffset, setLeftOffset] = useState(350) // 250 + 100px 우측 이동
  const [rightEdge, setRightEdge] = useState(400) // 초기값을 더 크게 설정
  const { tabs, activeTabKey, addTab, closeTab } = useWorkspaceStore()
  const { onTabClick, navigateInTab } = useTabRouter()
  const router = useRouter()
  
  // Calculate tabs position based on logo width and icons position using ResizeObserver
  useIsomorphicLayoutEffect(() => {
    const updatePositions = () => {
      if (logoRef.current) {
        setLeftOffset(logoRef.current.offsetWidth + 132) // logo width + 32px padding + 100px 우측 이동
      }
      if (iconsRef.current && typeof window !== 'undefined') {
        const rect = iconsRef.current.getBoundingClientRect()
        // 아이콘 영역이 아직 위치가 잡히지 않은 경우 기본값 사용
        if (rect.left > 0) {
          setRightEdge(window.innerWidth - rect.left + 20) // 20px 여백
        }
      }
    }
    
    // ResizeObserver로 body와 아이콘 영역 크기 변화 감지
    const resizeObserver = new ResizeObserver(() => {
      updatePositions()
    })
    
    if (typeof window !== 'undefined') {
      // 초기 계산을 약간 지연시켜 DOM이 완전히 렌더링된 후 실행
      setTimeout(updatePositions, 0)
      
      resizeObserver.observe(document.body)
      // 아이콘 영역도 관찰
      if (iconsRef.current) {
        resizeObserver.observe(iconsRef.current)
      }
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey
      
      if (isCtrlOrCmd && e.key === 't') {
        e.preventDefault()
        addTab({ route: '/', label: 'New Tab', icon: 'ph:globe-bold' })
      } else if (isCtrlOrCmd && e.key === 'w') {
        e.preventDefault()
        if (activeTabKey && tabs.find(t => t.key === activeTabKey)?.closable !== false) {
          closeTab(activeTabKey)
        }
      } else if (isCtrlOrCmd && e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = tabs.findIndex(t => t.key === activeTabKey)
        const nextIndex = e.shiftKey 
          ? (currentIndex - 1 + tabs.length) % tabs.length
          : (currentIndex + 1) % tabs.length
        if (tabs[nextIndex]) {
          onTabClick(tabs[nextIndex].key)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabKey, addTab, closeTab, onTabClick])

  return (
    <header className={clsx('flex flex-col h-[70px] bg-[#016B9F] text-white relative overflow-hidden', className)}>
      
      {/* Top Section - Exchange Rate */}
      <div className="flex justify-end py-1 mt-[3px]" style={{ paddingRight: `${rightEdge}px` }}>
        <HeaderExchange />
      </div>
      
      {/* Bottom Section - Logo, Tabs, Icons */}
      <div className="flex items-center flex-1 px-6 relative">
        {/* Left - Logo (moved up 15px) */}
        <div ref={logoRef} className="flex items-center gap-3 h-full -mt-[15px]">
          <Image 
            src="/ciwhite.png" 
            alt="Entrip" 
            width={40} 
            height={40} 
            priority 
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
          <Image 
            src="/citextwhite.png" 
            alt="Entrip" 
            width={120} 
            height={24} 
            priority 
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
        
        {/* Center - Tabs (positioned at bottom) */}
        <nav 
          className="absolute bottom-0 left-0 flex gap-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ 
            left: `${leftOffset}px`,
            right: `${rightEdge}px`,
            maxWidth: `calc(100vw - ${rightEdge}px - ${leftOffset}px)`
          }}
        >
          <div 
            ref={tabContainerRef}
            className="flex gap-1 items-center min-w-0"
          >
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => onTabClick(tab.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onTabClick(tab.key)
                }
              }}
              onAuxClick={(e) => {
                if (e.button === 1 && tab.closable !== false) { // Middle click
                  e.preventDefault()
                  closeTab(tab.key)
                }
              }}
              role="tab"
              tabIndex={0}
              aria-selected={activeTabKey === tab.key}
              className={clsx(
                'group h-[36px] px-3 flex items-center gap-1 text-sm font-medium transition-all duration-150 cursor-pointer',
                'flex-shrink-0 whitespace-nowrap',
                activeTabKey === tab.key
                  ? 'bg-white text-brand-700 rounded-t-lg' 
                  : 'bg-brand-800/60 text-white/80 hover:bg-brand-800 rounded-t-lg'
              )}
              style={{
                minWidth: '120px',
                maxWidth: '200px'
              }}
            >
              <Icon icon={tab.icon} className={clsx(
                "w-4 h-4 flex-shrink-0",
                activeTabKey === tab.key ? "text-brand-700" : "text-white/70"
              )} />
              <span className={clsx(
                "text-[13px] font-medium truncate flex-1 text-left",
                activeTabKey === tab.key ? "text-brand-700" : "text-white/80"
              )}>{tab.label}</span>
              {tab.closable !== false && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    closeTab(tab.key); 
                  }}
                  className={clsx(
                    "p-0.5 rounded hover:bg-black/10 transition-opacity -mr-1",
                    activeTabKey === tab.key ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Icon icon="ph:x" className={clsx(
                    "w-3 h-3",
                    activeTabKey === tab.key ? "text-brand-700 hover:text-red-500" : "text-white/70"
                  )} />
                </button>
              )}
            </div>
          ))}
          
          {/* 새 탭 추가 버튼 */}
          <button 
            onClick={() => addTab({ route: '/', label: 'New Tab', icon: 'ph:globe-bold' })}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            title="새 탭 추가"
          >
            <Icon icon="ph:plus" className="w-4 h-4 text-white/60" />
          </button>
          </div>
        </nav>
        
        {/* Right - Icons (positioned at top with tighter spacing) */}
        <div ref={iconsRef} className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <IconButton 
            icon="ph:map-trifold-bold" 
            title="지도" 
            onClick={() => window.open('https://maps.google.com', '_blank')}
          />
          <IconButton 
            icon="ph:airplane-takeoff-bold" 
            title="항공편 조회" 
            onClick={() => {
              if (activeTabKey) {
                navigateInTab('/flight-schedule')
              } else {
                router.push('/flight-schedule')
              }
            }}
          />
          <IconButton icon="ph:bell-bold" title="알림" badge />
          <IconButton icon="ph:envelope-bold" title="메일" />
          <IconButton icon="ph:chat-circle-bold" title="메신저" />
          <IconButton icon="ph:gear-bold" title="설정" />
        </div>
      </div>
    </header>
  )
}

interface IconButtonProps {
  icon: string;
  title: string;
  badge?: boolean;
  onClick?: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  title,
  badge,
  onClick 
}) => (
  <button 
    className="relative p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
    title={title}
    onClick={onClick}
  >
    <Icon icon={icon} className="w-[26px] h-[26px]" />
    {badge && (
      <span className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
    )}
  </button>
);