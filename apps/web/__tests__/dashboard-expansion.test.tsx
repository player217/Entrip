import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TodayBookingsSection } from '../src/components/dashboard/sections/TodayBookingsSection';
import { ActiveTeamsSection } from '../src/components/dashboard/sections/ActiveTeamsSection';
import { useBookings } from '../src/hooks/useBookings';
import type { Booking } from '@entrip/shared';

jest.mock('../src/hooks/useBookings', () => ({ useBookings: jest.fn() }));

const booking = (id: string, overrides: Partial<Booking> = {}) => ({
  id, teamName: id, destination: '서울', customerName: '담당자', paxCount: 2,
  startDate: '2026-11-17', endDate: '2026-11-20', createdAt: '2026-11-16T10:00:00Z',
  totalPrice: 100000, currency: 'KRW', status: 'CONFIRMED', ...overrides,
} as Booking);

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-17T12:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('expands and collapses exact departure and created-today sets independently', () => {
  const departures = Array.from({ length: 5 }, (_, i) => booking(`출발팀 ${i + 1}`));
  const newBookings = Array.from({ length: 5 }, (_, i) => booking(`신규팀 ${i + 1}`, {
    // Today-created bookings can depart in a different month; expansion must keep them.
    startDate: '2027-01-10', endDate: '2027-01-12', createdAt: '2026-11-17T10:00:00Z',
  }));
  (useBookings as jest.Mock).mockReturnValue({ bookings: [...departures, ...newBookings,
    booking('취소된 출발팀', { status: 'CANCELLED' }),
    booking('오래된 예약', { startDate: '2027-02-01' }),
  ], isLoading: false, isError: false });
  render(<TodayBookingsSection />);

  expect(screen.getByText('오늘 출발 (5팀)')).toBeVisible();
  expect(screen.getByText('신규 예약 (5건)')).toBeVisible();
  expect(screen.queryByText('출발팀 5')).not.toBeInTheDocument();
  expect(screen.queryByText('신규팀 5')).not.toBeInTheDocument();
  const departuresButton = screen.getByRole('button', { name: '+2개 팀 더보기' });
  expect(departuresButton).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(departuresButton);
  expect(screen.getByText('출발팀 5')).toBeVisible();
  expect(screen.getByRole('button', { name: '오늘 출발 접기' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.queryByText('신규팀 5')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+2건 더보기' }));
  expect(screen.getByText('신규팀 5')).toBeVisible();
  expect(screen.queryByText('취소된 출발팀')).not.toBeInTheDocument();
  expect(screen.queryByText('오래된 예약')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '오늘 출발 접기' }));
  expect(screen.queryByText('출발팀 5')).not.toBeInTheDocument();
  expect(screen.getByText('신규팀 5')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '신규 예약 접기' }));
  expect(screen.queryByText('신규팀 5')).not.toBeInTheDocument();
});

test('reports all active/upcoming teams while keeping a compact expandable preview', () => {
  (useBookings as jest.Mock).mockReturnValue({ bookings: [
    ...Array.from({ length: 8 }, (_, i) => booking(`여행팀 ${i + 1}`, { startDate: '2026-11-16' })),
    ...Array.from({ length: 7 }, (_, i) => booking(`예정팀 ${i + 1}`, { startDate: '2026-11-20' })),
    booking('취소팀', { status: 'CANCELLED' }),
    booking('대기팀', { status: 'PENDING' }),
    booking('범위 밖', { startDate: '2026-12-01' }),
  ], isLoading: false, isError: false });
  render(<ActiveTeamsSection />);
  expect(screen.getByText('여행 중인 팀 (8팀)')).toBeVisible();
  expect(screen.getByText('출발 예정 (7팀)')).toBeVisible();
  expect(screen.queryByText('여행팀 8')).not.toBeInTheDocument();
  expect(screen.queryByText('예정팀 7')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '+2개 팀 더보기' }));
  fireEvent.click(screen.getByRole('button', { name: '+3개 팀 더보기' }));
  expect(screen.getByText('여행팀 8')).toBeVisible();
  expect(screen.getByText('예정팀 7')).toBeVisible();
  expect(screen.queryByText('취소팀')).not.toBeInTheDocument();
  expect(screen.queryByText('대기팀')).not.toBeInTheDocument();
  expect(screen.queryByText('범위 밖')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '여행 중인 팀 접기' }));
  fireEvent.click(screen.getByRole('button', { name: '출발 예정 접기' }));
  expect(screen.queryByText('여행팀 8')).not.toBeInTheDocument();
  expect(screen.queryByText('예정팀 7')).not.toBeInTheDocument();
});
