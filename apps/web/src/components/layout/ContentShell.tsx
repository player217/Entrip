'use client'

import React from 'react'
import { clsx } from 'clsx'
import { useWorkspaceStore } from '@entrip/shared/client'

interface ContentShellProps extends React.ComponentProps<'main'> {
  children: React.ReactNode
}

export function ContentShell({
  className,
  children,
  ...props
}: ContentShellProps) {
  const { sidebarCollapsed } = useWorkspaceStore()
  
  // Version tracking  
  console.log('🏗️ ContentShell loaded - Version: 2025-01-22-v2');
  
  return (
    <main
      className={clsx(
        'relative bg-white flex-1 min-h-0 overflow-auto transition-all duration-300',
        'shadow-lg',
        className
      )}
      {...props}
    >
      {/* 헤더·사이드바 조인트 라운드 처리 - CSS mask로 오목한 곡선 */}
      <div 
        className="absolute pointer-events-none"
        style={{
          top: '-1px',
          left: '-1px',
          width: '30px',
          height: '30px',
          background: '#016B9F',
          WebkitMask: 'radial-gradient(circle at 100% 100%, transparent 0 30px, #000 31px)',
          mask: 'radial-gradient(circle at 100% 100%, transparent 0 30px, #000 31px)',
          zIndex: 40,
        }}
        aria-hidden="true"
      />
      <div className="p-6">
        {children}
      </div>
    </main>
  )
}