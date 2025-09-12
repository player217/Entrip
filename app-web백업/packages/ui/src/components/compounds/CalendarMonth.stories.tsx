import type { Meta, StoryObj } from '@storybook/react';
import { CalendarMonth } from './CalendarMonth';
import type { BookingEntry } from '@entrip/shared';

const meta: Meta<typeof CalendarMonth> = {
  title: 'Compounds/CalendarMonth',
  component: CalendarMonth,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleEvents = [
  {
    id: '1',
    date: '2025-01-15',
    title: '김철수팀 - 발리 골프투어',
    type: '골프',
    status: 'confirmed',
  },
  {
    id: '2',
    date: '2025-01-15',
    title: '이영희팀 - 태국 인센티브',
    type: '인센',
    status: 'pending',
  },
  {
    id: '3',
    date: '2025-01-18',
    title: '박민수팀 - 몰디브 허니문',
    type: '허니문',
    status: 'confirmed',
  },
  {
    id: '4',
    date: '2025-01-20',
    title: '정수진팀 - 괌 에어텔',
    type: '에어텔',
    status: 'completed',
  },
  {
    id: '5',
    date: '2025-01-20',
    title: '최현우팀 - 도쿄 자유여행',
    type: '자유',
    status: 'confirmed',
  },
  {
    id: '6',
    date: '2025-01-22',
    title: '강미나팀 - 싱가포르 MICE',
    type: 'MICE',
    status: 'pending',
  },
  {
    id: '7',
    date: '2025-01-25',
    title: '윤재호팀 - 하와이 골프',
    type: '골프',
    status: 'confirmed',
  },
  {
    id: '8',
    date: '2025-01-28',
    title: '송지은팀 - 칸쿤 허니문',
    type: '허니문',
    status: 'cancelled',
  },
];

export const Default: Story = {
  args: {
    month: new Date(2025, 0, 1),
    events: sampleEvents,
  },
};

export const Empty: Story = {
  args: {
    month: new Date(2025, 0, 1),
    events: [],
  },
};

export const CurrentMonth: Story = {
  args: {
    events: sampleEvents.map(event => ({
      ...event,
      date: event.date.replace('2025-01', new Date().toISOString().slice(0, 7)),
    })),
  },
};

export const WithInteraction: Story = {
  args: {
    month: new Date(2025, 0, 1),
    events: sampleEvents,
    onDayClick: (date: Date) => {
      alert(`날짜 클릭: ${date.toLocaleDateString('ko-KR')}`);
    },
    onEventClick: (event: BookingEntry) => {
      alert(`예약 클릭: ${event.title}`);
    },
  },
};

export const EnglishLocale: Story = {
  args: {
    month: new Date(2025, 0, 1),
    events: sampleEvents,
    locale: 'en',
  },
};
