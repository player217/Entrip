import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from '../feedback/ErrorState'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '빈 상태를 표시하는 컴포넌트입니다.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: '빈 상태 제목',
    },
    message: {
      control: 'text',
      description: '빈 상태 메시지',
    },
    action: {
      description: '액션 버튼 설정',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const NoBookings: Story = {
  args: {
    title: '예약이 없습니다',
    message: '아직 등록된 예약이 없습니다. 새로운 예약을 추가해보세요.',
    action: {
      label: '예약 추가',
      onClick: () => {
        // Storybook action handled by args
      },
    },
  },
}

export const NoSearchResults: Story = {
  args: {
    title: '검색 결과가 없습니다',
    message: '다른 검색어로 다시 시도해보세요.',
  },
}

export const CustomIcon: Story = {
  args: {
    title: '메시지가 없습니다',
    message: '받은 메시지가 없습니다.',
    icon: (
      <div className="w-16 h-16 mb-4 text-gray-400">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
    ),
  },
}
