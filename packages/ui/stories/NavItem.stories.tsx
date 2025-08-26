import type { Meta, StoryObj } from '@storybook/react'
import { NavItem } from '../../../apps/web/src/components/layout/NavItem'

const meta: Meta<typeof NavItem> = {
  title: 'Layout/NavItem',
  component: NavItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '사이드바 네비게이션 아이템 컴포넌트입니다.',
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
  },
  argTypes: {
    href: {
      control: 'text',
      description: '링크 경로',
    },
    name: {
      control: 'text',
      description: '메뉴 이름',
    },
    icon: {
      control: 'text',
      description: '메뉴 아이콘',
    },
    isCollapsed: {
      control: 'boolean',
      description: '사이드바 접힘 상태',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    href: '/',
    name: '대시보드',
    icon: '📊',
    isCollapsed: false,
  },
}

export const Active: Story = {
  args: {
    href: '/',
    name: '대시보드',
    icon: '📊',
    isCollapsed: false,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
}

export const Inactive: Story = {
  args: {
    href: '/reservations',
    name: '예약 관리',
    icon: '📅',
    isCollapsed: false,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
}

export const Collapsed: Story = {
  args: {
    href: '/',
    name: '대시보드',
    icon: '📊',
    isCollapsed: true,
  },
}

export const CollapsedActive: Story = {
  args: {
    href: '/',
    name: '대시보드',
    icon: '📊',
    isCollapsed: true,
  },
  parameters: {
    nextjs: {
      navigation: {
        pathname: '/',
      },
    },
  },
}
