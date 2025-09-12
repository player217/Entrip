import type { Meta, StoryObj } from '@storybook/react';
import { ChartCard } from './ChartCard';

const meta: Meta<typeof ChartCard> = {
  title: 'Compounds/ChartCard',
  component: ChartCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthlyRevenue: Story = {
  args: {
    title: '월별 매출 현황',
    data: [
      { name: '1월', value: 21000000 },
      { name: '2월', value: 16000000 },
      { name: '3월', value: 9800000 },
      { name: '4월', value: 12000000 },
      { name: '5월', value: 18500000 },
      { name: '6월', value: 24000000 },
    ],
  },
};

export const BookingsByType: Story = {
  args: {
    title: '예약 유형별 통계',
    data: [
      { name: '골프', value: 45 },
      { name: '인센티브', value: 32 },
      { name: '허니문', value: 28 },
      { name: '에어텔', value: 15 },
      { name: '기타', value: 8 },
    ],
    color: 'var(--color-info)',
  },
};

export const TeamPerformance: Story = {
  args: {
    title: '담당자별 실적',
    data: [
      { name: '김철수', value: 8500000 },
      { name: '이영희', value: 7200000 },
      { name: '박민수', value: 6800000 },
      { name: '정수진', value: 5900000 },
    ],
    color: 'var(--color-success)',
    height: 300,
  },
};

export const WeeklyTrend: Story = {
  args: {
    title: '주간 예약 추이',
    data: [
      { name: '월', value: 12 },
      { name: '화', value: 19 },
      { name: '수', value: 15 },
      { name: '목', value: 25 },
      { name: '금', value: 31 },
      { name: '토', value: 8 },
      { name: '일', value: 5 },
    ],
    color: 'var(--color-warning)',
  },
};
