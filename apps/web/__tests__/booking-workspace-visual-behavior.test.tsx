import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BookingWorkspace } from '@/features/bookings/BookingWorkspace';
import { type BookingRecord } from '@/features/bookings/booking-model';

let mockLoad: { data: BookingRecord[]; error: Error | undefined; isLoading: boolean; mutate: jest.Mock };
jest.mock('swr', () => ({ __esModule: true, default: () => mockLoad, useSWRConfig: () => ({ mutate: jest.fn() }) }));
jest.mock('@/lib/auth-store', () => ({ useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 'admin', name: '담당자', companyCode: 'entrip' } }) }));
jest.mock('@/hooks/useTabState', () => ({ useTabState: (initial: unknown) => jest.requireActual('react').useState(initial) }));
jest.mock('@/components/workspace/WorkspaceTabContext', () => ({ useWorkspaceTabKey: () => null }));
jest.mock('@entrip/shared/client', () => ({ useWorkspaceStore: { getState: () => ({ updateTabState: jest.fn() }) } }));

const booking: BookingRecord = { id: 'b1', bookingNumber: 'BK-001', version: 1, teamName: '부산 출발 홋카이도 가족 여행 긴 팀명', type: 'FIT', origin: '부산', destination: '삿포로', startDate: '2026-11-17', endDate: '2026-11-18', totalPax: 4, coordinator: '담당자', currency: 'KRW', status: 'IN_PROGRESS', totalPrice: 1200000 };
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-17T12:00:00'));
  mockLoad = { data: [booking], error: undefined, isLoading: false, mutate: jest.fn() };
});
afterEach(() => jest.useRealTimers());

test('a failed request never becomes an empty result or a definitive zero total, including cached data', () => {
  mockLoad.error = new Error('연결 실패');
  render(<BookingWorkspace view="month-list" />);
  expect(screen.getByRole('alert')).toHaveTextContent('연결 실패');
  expect(screen.getByText('조회 실패 · 예약 건수와 합계를 확인할 수 없습니다.')).toBeInTheDocument();
  expect(screen.queryByText(/예약 \d+건 ·/)).not.toBeInTheDocument();
  expect(screen.queryByText('해당 기간에 예약이 없습니다.')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(mockLoad.mutate).toHaveBeenCalledTimes(1);
});

test('empty search is distinguished from an empty period and clearing it restores rows', () => {
  render(<BookingWorkspace view="month-list" />);
  fireEvent.change(screen.getByLabelText('예약 검색'), { target: { value: '없는 고객' } });
  const list = within(screen.getByRole('region', { name: '예약 목록' }));
  expect(list.getByText('검색 조건에 맞는 예약이 없습니다.')).toBeInTheDocument();
  expect(list.queryByText('해당 기간에 예약이 없습니다.')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('예약 검색'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: booking.teamName })).toBeInTheDocument();
});

test('the compact calendar keeps full team names and status in the selected-day agenda', () => {
  render(<BookingWorkspace view="month" />);
  const agenda = within(screen.getByTestId('booking-day-agenda'));
  expect(agenda.getByText(booking.teamName)).toBeInTheDocument();
  expect(agenda.getByText('진행', { exact: true })).toBeInTheDocument();
  fireEvent.click(agenda.getByRole('button', { name: '2026-11-19 일정 보기' }));
  expect(agenda.getByText('선택한 날짜에 예약이 없습니다.')).toBeInTheDocument();
  fireEvent.click(agenda.getByRole('button', { name: '2026-11-19 예약 등록' }));
  expect(screen.getByRole('dialog', { name: '새 예약 등록' })).toBeInTheDocument();
  expect(screen.getByLabelText('출발일 *')).toHaveValue('2026-11-19');
  expect(screen.getByLabelText('귀국일 *')).toHaveValue('2026-11-19');
});
