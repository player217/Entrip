import type { Meta, StoryObj } from '@storybook/react';
import { CommandBar } from './CommandBar';

const meta: Meta<typeof CommandBar> = {
  title: 'Compounds/CommandBar',
  component: CommandBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      control: 'object',
      description: '사용자 정보',
    },
    exchangeRates: {
      control: 'object',
      description: '환율 정보',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithUser: Story = {
  args: {
    user: {
      name: '김태영',
      company: '울산관광여행사',
    },
  },
};

export const CustomExchangeRates: Story = {
  args: {
    user: {
      name: '이민수',
      company: 'SK 투어',
    },
    exchangeRates: {
      USD: 1350.2,
      EUR: 1480.5,
      JPY: 9.12,
    },
  },
};

export const LongCompanyName: Story = {
  args: {
    user: {
      name: '박지성',
      company: '삼성전자 글로벌 마케팅 사업부 인센티브 투어팀',
    },
  },
};

export const MobileView: Story = {
  args: {
    user: {
      name: '홍길동',
      company: 'Entrip',
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
