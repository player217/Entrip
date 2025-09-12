'use client'

import React, { useState } from 'react'
import { Icon, FlowNode } from '@entrip/ui'

interface Node {
  id: string
  position: { x: number; y: number }
  data: {
    label: string
    icon: string
    type: 'trigger' | 'action' | 'condition'
  }
}

interface Edge {
  id: string
  source: string
  target: string
}

export function FlowCanvas() {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: '1',
      position: { x: 100, y: 100 },
      data: { label: '새 예약 접수', icon: 'ph:calendar-plus-bold', type: 'trigger' }
    },
    {
      id: '2',
      position: { x: 350, y: 100 },
      data: { label: '이메일 발송', icon: 'ph:envelope-simple-bold', type: 'action' }
    },
    {
      id: '3',
      position: { x: 600, y: 100 },
      data: { label: 'CRM 업데이트', icon: 'ph:database-bold', type: 'action' }
    }
  ])

  const [edges] = useState<Edge[]>([
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' }
  ])

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setDragOffset({
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y
    })
    setDraggingNode(nodeId)
    setSelectedNode(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    setNodes(nodes.map(node =>
      node.id === draggingNode
        ? { ...node, position: { x: newX, y: newY } }
        : node
    ))
  }

  const handleMouseUp = () => {
    setDraggingNode(null)
  }

  return (
    <div className="h-full relative overflow-hidden bg-flow">
      {/* Canvas SVG for edges */}
      <svg
        className="absolute inset-0 w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#7046FF" />
          </marker>
        </defs>
        
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source)
          const targetNode = nodes.find(n => n.id === edge.target)
          if (!sourceNode || !targetNode) return null

          const startX = sourceNode.position.x + 180
          const startY = sourceNode.position.y + 28
          const endX = targetNode.position.x
          const endY = targetNode.position.y + 28

          return (
            <g key={edge.id}>
              <path
                d={`M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`}
                stroke="#7046FF"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: node.position.x,
            top: node.position.y,
            cursor: draggingNode === node.id ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        >
          <FlowNode 
            data={node.data} 
            selected={selectedNode === node.id}
            onClick={() => {}}
            className=""
          />
          
          {/* Plus button for adding new node */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2">
            <button 
              className="w-6 h-6 rounded-full border border-gray-300 bg-white hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-colors flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Implement add node functionality
              }}
            >
              <Icon icon="ph:plus" className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-1 flex items-center gap-1">
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="트리거 추가">
          <Icon icon="ph:lightning-bold" className="w-5 h-5 text-purple-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="액션 추가">
          <Icon icon="ph:play-bold" className="w-5 h-5 text-blue-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="조건 추가">
          <Icon icon="ph:git-branch-bold" className="w-5 h-5 text-orange-600" />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="확대">
          <Icon icon="ph:magnifying-glass-plus-bold" className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="축소">
          <Icon icon="ph:magnifying-glass-minus-bold" className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Right Properties Panel */}
      {selectedNode && (
        <div className="absolute right-0 top-0 bottom-0 w-[360px] bg-white border-l border-gray-200 shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Setup ✓</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">노드 이름</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-canvas-base focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                defaultValue={nodes.find(n => n.id === selectedNode)?.data.label}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">노드 타입</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-canvas-base focus:ring-2 focus:ring-brand-primary focus:border-brand-primary">
                <option value="trigger">Trigger</option>
                <option value="action">Action</option>
                <option value="condition">Condition</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">실행 조건</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-canvas-base focus:ring-2 focus:ring-brand-primary"
                rows={3}
                placeholder="새 예약이 접수되었을 때"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-canvas-base focus:ring-2 focus:ring-brand-primary"
                rows={4}
                placeholder="추가 메모사항을 입력하세요"
              />
            </div>

            <div className="pt-4">
              <button className="w-full px-4 py-2 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
                설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}