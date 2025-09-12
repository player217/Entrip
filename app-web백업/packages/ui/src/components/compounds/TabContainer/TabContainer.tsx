'use client'

import React, { useState, ReactNode } from 'react'
import { clsx } from 'clsx'

export interface TabItem {
  key: string
  label: string
  content?: ReactNode
}

export interface TabContainerProps {
  tabs: TabItem[]
  initial?: string
  hideContent?: boolean
  onTabChange?: (key: string) => void
}

export function TabContainer({ tabs, initial, hideContent: _hideContent = false, onTabChange }: TabContainerProps) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key)
  
  if (!tabs.length) return null

  const handleTabClick = (key: string) => {
    setActive(key)
    onTabChange?.(key)
  }
  
  return (
    <div className="flex w-full overflow-x-auto whitespace-nowrap border-b">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => handleTabClick(t.key)}
          className={clsx(
            'px-4 py-2 text-sm font-medium',
            active === t.key
              ? 'border-b-2 border-brand-primary text-brand-primary'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}