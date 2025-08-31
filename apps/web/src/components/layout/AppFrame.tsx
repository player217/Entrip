'use client'

import React from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ContentShell } from './ContentShell'
import { TabContentManager } from './TabContentManager'
import { useWorkspaceStore } from '@entrip/shared/client'
import { clsx } from 'clsx'

interface AppFrameProps {
  children: React.ReactNode
  useTabSystem?: boolean // 탭 시스템 사용 여부
  user?: any // 사용자 정보
}

export default function AppFrame({ children, useTabSystem = false, user }: AppFrameProps) {
  const { sidebarCollapsed } = useWorkspaceStore()
  
  return (
    <div className="grid grid-rows-[70px_1fr] h-screen min-w-0 overflow-hidden">
      <Header className="row-start-1 row-end-2 z-50" useTabSystem={useTabSystem} />
      <div className="row-start-2 flex min-h-0">
        <Sidebar />
        <ContentShell>
          {useTabSystem ? <TabContentManager /> : children}
        </ContentShell>
      </div>
    </div>
  )
}