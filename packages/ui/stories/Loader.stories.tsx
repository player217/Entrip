import type { Meta, StoryObj } from '@storybook/react'
import { Loader } from '../feedback/Loader'

const meta: Meta<typeof Loader> = {
  title: 'UI/Feedback/Loader',
  component: Loader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '로딩 상태를 표시하는 로더 컴포넌트입니다.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '로더의 크기',
    },
    text: {
      control: 'text',
      description: '로딩 텍스트',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Small: Story = {
  args: {
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
  },
}

export const WithText: Story = {
  args: {
    text: '데이터를 불러오는 중...',
  },
}

export const SmallWithText: Story = {
  args: {
    size: 'sm',
    text: '잠시만 기다려주세요',
  },
}

export const LargeWithText: Story = {
  args: {
    size: 'lg',
    text: '처리 중입니다...',
  },
}
