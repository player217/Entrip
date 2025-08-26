import type { Meta, StoryObj } from '@storybook/react'
import { ErrorState } from '../feedback/ErrorState'

const meta: Meta<typeof ErrorState> = {
  title: 'UI/Feedback/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '에러 상태를 표시하는 컴포넌트입니다.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: '에러 제목',
    },
    message: {
      control: 'text',
      description: '에러 메시지',
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

export const CustomMessage: Story = {
  args: {
    title: '서버 연결 실패',
    message: '서버와의 연결이 끊어졌습니다. 인터넷 연결을 확인해주세요.',
  },
}

export const WithAction: Story = {
  args: {
    title: '페이지를 찾을 수 없습니다',
    message: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
    action: {
      label: '홈으로 돌아가기',
      onClick: () => {
        // Storybook action handled by args
      },
    },
  },
}

export const LoadError: Story = {
  args: {
    title: '데이터 로드 실패',
    message: '데이터를 불러오는 중 문제가 발생했습니다.',
    action: {
      label: '다시 시도',
      onClick: () => {
        // Storybook action handled by args
      },
    },
  },
}
