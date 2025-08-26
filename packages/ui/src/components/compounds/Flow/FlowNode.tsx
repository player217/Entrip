import React from 'react'
import { cn } from '../../../utils'
import { Icon } from '../../primitives/Icon'

export interface FlowNodeData {
  label: string
  icon: string
  type: 'trigger' | 'action' | 'condition'
}

export interface FlowNodeProps {
  data: FlowNodeData
  selected?: boolean
  onClick?: () => void
  className?: string
}

export function FlowNode({ data, selected, onClick, className }: FlowNodeProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trigger': return 'text-purple-600'
      case 'action': return 'text-blue-600'
      case 'condition': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div 
      className={cn(
        "rounded-lg shadow-sm border bg-white",
        "px-4 py-3 flex items-center gap-3 min-w-[180px]",
        "transition-all duration-200 cursor-pointer",
        selected 
          ? "border-brand-500 shadow-md" 
          : "border-gray-300 hover:shadow-md hover:border-brand-500",
        className
      )}
      onClick={onClick}
    >
      <Icon 
        icon={data.icon} 
        className={cn("w-5 h-5", getTypeColor(data.type))} 
      />
      <span className="font-medium text-gray-900 text-sm">
        {data.label}
      </span>
    </div>
  )
}

export interface PlusButtonProps {
  onClick?: () => void
  className?: string
}

export function PlusButton({ onClick, className }: PlusButtonProps) {
  return (
    <button
      className={cn(
        "w-6 h-6 rounded-full border border-gray-300 bg-white",
        "hover:bg-brand-500 hover:text-white hover:border-brand-500",
        "transition-all duration-200",
        "flex items-center justify-center shadow-sm",
        className
      )}
      onClick={onClick}
    >
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 1v5H1v1h5v5h1V7h5V6H7V1H6z"/>
      </svg>
    </button>
  )
}

export interface PropertyPanelProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PropertyPanel({ 
  title = "Setup ✓", 
  children, 
  className 
}: PropertyPanelProps) {
  return (
    <div className={cn("w-[360px] border-l border-gray-200 bg-white", className)}>
      <div className="p-4 border-b">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
