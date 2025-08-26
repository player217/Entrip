import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton, SkeletonGroup } from '../feedback/Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '로딩 중인 콘텐츠의 자리 표시자 컴포넌트입니다.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
      description: '스켈레톤 모양',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: '애니메이션 효과',
    },
    width: {
      control: 'text',
      description: '너비',
    },
    height: {
      control: 'text',
      description: '높이',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Text: Story = {
  args: {
    variant: 'text',
    height: '1rem',
  },
}

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 40,
    height: 40,
  },
}

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: 100,
  },
}

export const NoAnimation: Story = {
  args: {
    animation: 'none',
    height: 20,
  },
}

export const WaveAnimation: Story = {
  args: {
    animation: 'wave',
    height: 20,
  },
}

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-80 p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" height={20} className="mb-2" />
          <Skeleton variant="text" height={16} width="60%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={200} className="mb-4" />
      <SkeletonGroup count={3} gap={2}>
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </SkeletonGroup>
    </div>
  ),
}

export const ListSkeleton: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <SkeletonGroup count={5} gap={4} direction="vertical">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1">
              <Skeleton variant="text" height={16} className="mb-1" />
              <Skeleton variant="text" height={14} width="70%" />
            </div>
          </div>
        ))}
      </SkeletonGroup>
    </div>
  ),
}
