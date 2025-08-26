import type { Meta, StoryObj } from '@storybook/react';
import { ExchangeTicker } from './ExchangeTicker';

const meta: Meta<typeof ExchangeTicker> = {
  title: 'Compounds/ExchangeTicker',
  component: ExchangeTicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    rates: [
      { currency: 'JPY', symbol: '¥', rate: 1098.23, change: 0.5 },
      { currency: 'EUR', symbol: '€', rate: 1421.56, change: -0.3 },
      { currency: 'USD', symbol: '$', rate: 1334.80, change: 0.2 },
      { currency: 'CNY', symbol: '¥', rate: 185.42, change: -0.1 },
    ],
  },
};

export const Loading: Story = {
  args: {
    rates: [],
  },
};

export const WithRefresh: Story = {
  args: {
    rates: [
      { currency: 'USD', symbol: '$', rate: 1334.80, change: 0.2 },
      { currency: 'EUR', symbol: '€', rate: 1421.56, change: -0.3 },
    ],
    onRefresh: () => alert('환율 정보를 새로고침합니다.'),
  },
};
