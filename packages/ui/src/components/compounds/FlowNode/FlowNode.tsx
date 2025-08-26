'use client'

import React from 'react'
import { Icon } from '../../primitives/Icon'

export interface FlowNodeData {
  label: string
  icon?: string
  type?: 'trigger' | 'action' | 'condition'
}

export interface FlowNodeProps {
  data: FlowNodeData
  selected?: boolean
}

export const FlowNode: React.FC<FlowNodeProps> = ({ data, selected = false }) => {
  const typeStyles = {
    trigger: 'border-purple-400',
    action: 'border-brand-primary',
    condition: 'border-orange-400'
  }

  return (
    <div 
      className={`
        rounded-lg border-2 bg-white shadow-md px-4 py-3 
        flex items-center gap-2 min-w-[160px]
        ${typeStyles[data.type || 'action']}
        ${selected ? 'ring-2 ring-brand-primary ring-offset-2' : ''}
      `}
    >
      {data.icon && (
        <Icon icon={data.icon} className="w-5 h-5 text-gray-600" />
      )}
      <span className="text-sm font-medium text-gray-800">{data.label}</span>
    </div>
  )
}