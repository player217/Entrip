import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: '버튼',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: '버튼',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: '버튼',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: '삭제',
    variant: 'danger',
  },
};

export const Small: Story = {
  args: {
    children: '작은 버튼',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: '큰 버튼',
    size: 'lg',
  },
};

export const Loading: Story = {
  args: {
    children: '저장 중...',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: '비활성',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: '전체 너비',
    fullWidth: true,
  },
};
