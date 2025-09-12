import type { Meta, StoryObj } from '@storybook/react'
import { FlowNode, PlusButton, PropertyPanel } from './FlowNode'

const meta = {
  title: 'Compounds/Flow/FlowNode',
  component: FlowNode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FlowNode>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    data: {
      label: '예약 접수',
      icon: 'ph:note-pencil-bold',
      type: 'trigger',
    },
  },
}

export const WithSettingsIcon: Story = {
  args: {
    data: {
      label: '가격 산정',
      icon: 'ph:gear-bold',
      type: 'action',
    },
  },
}

export const WithEmailIcon: Story = {
  args: {
    data: {
      label: '고객 알림',
      icon: 'ph:envelope-bold',
      type: 'action',
    },
  },
}

export const PlusButtonStory: Story = {
  args: {
    data: {
      label: 'Plus Button Demo',
      icon: 'ph:plus-bold',
      type: 'action',
    },
  },
  render: () => <PlusButton />,
}

export const PropertyPanelStory: Story = {
  args: {
    data: {
      label: 'Property Panel Demo',
      icon: 'ph:gear-bold',
      type: 'action',
    },
  },
  render: () => (
    <PropertyPanel>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">노드 이름</label>
          <input 
            type="text" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
            defaultValue="예약 접수"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">노드 타입</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>Trigger</option>
            <option>Action</option>
            <option>Condition</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">실행 조건</label>
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" 
            rows={3}
            defaultValue="새 예약이 접수되었을 때"
          />
        </div>
      </div>
    </PropertyPanel>
  ),
}

export const FlowCanvas: Story = {
  args: {
    data: {
      label: 'Flow Canvas Demo',
      icon: 'ph:flow-arrow-bold',
      type: 'trigger',
    },
  },
  render: () => (
    <div className="w-full h-[400px] bg-flow relative">
      <div className="absolute top-10 left-10">
        <FlowNode 
          data={{
            label: '예약 접수',
            icon: 'ph:note-pencil-bold',
            type: 'trigger'
          }}
        />
        <div className="flex justify-center mt-2">
          <PlusButton />
        </div>
      </div>
      
      <style>{`
        .bg-flow {
          background-color: #FDF9F2;
          background-image: radial-gradient(1px 1px, #E6E2DE 20%, transparent 20%);
          background-size: 4px 4px;
        }
      `}</style>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
}
