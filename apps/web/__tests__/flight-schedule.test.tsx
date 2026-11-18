import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { FlightScheduleSearch } from '../src/components/FlightScheduleSearch';
import { flightAPI } from '@entrip/shared';

jest.mock('@entrip/shared', () => ({
  KOREAN_AIRPORTS: [{ code: 'PUS', name: '김해' }, { code: 'ICN', name: '인천' }],
  getAirportByCode: (code: string) => code === 'PUS' ? { name: '김해' } : undefined,
  getInternationalAirportByCode: (code: string) => code === 'NRT' ? { name: '나리타' } : undefined,
  flightAPI: { getSchedule: jest.fn() },
}));

const getSchedule = flightAPI.getSchedule as jest.Mock;
const fixture = {
  airport: 'PUS', crawledAt: '2025-07-29T08:39:17Z', source: '검증 자료', stale: true,
  flights: [
    { airline: '에어부산', flightNo: 'BX164', destination: 'NRT', departureTime: '07:35', arrivalTime: '10:05', days: { mon: true, tue: false } },
    { airline: '에어부산', flightNo: 'BX112', destination: 'NRT', departureTime: '14:25', arrivalTime: '16:55', days: { mon: true, tue: true } },
  ],
};

beforeEach(() => { getSchedule.mockReset(); });

it('renders both departures in the same airline and weekday cell and identifies stale data', async () => {
  getSchedule.mockResolvedValue(fixture);
  render(<FlightScheduleSearch />);
  fireEvent.change(screen.getByLabelText('출발 공항'), { target: { value: 'PUS' } });
  await screen.findByRole('option', { name: 'NRT - 나리타' });
  fireEvent.change(screen.getByLabelText('도착 공항'), { target: { value: 'NRT' } });
  const row = screen.getByRole('row', { name: /에어부산/ });
  const monday = within(row).getAllByRole('cell')[0]!;
  expect(within(monday).getByText('BX164')).toBeInTheDocument();
  expect(within(monday).getByText('BX112')).toBeInTheDocument();
  expect(screen.getByText(/오래된 자료입니다/)).toBeInTheDocument();
  expect(getSchedule).toHaveBeenCalledTimes(1);
});

it('reports source failure rather than showing an empty successful schedule', async () => {
  getSchedule.mockRejectedValue(new Error('503'));
  render(<FlightScheduleSearch />);
  fireEvent.change(screen.getByLabelText('출발 공항'), { target: { value: 'PUS' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('갱신하지 못했습니다');
  expect(screen.queryByText('제공된 자료에 운항 노선이 없습니다.')).not.toBeInTheDocument();
});

it('retains the previous snapshot with a warning when refresh fails', async () => {
  getSchedule.mockResolvedValueOnce(fixture).mockRejectedValueOnce(new Error('503'));
  render(<FlightScheduleSearch />);
  fireEvent.change(screen.getByLabelText('출발 공항'), { target: { value: 'PUS' } });
  await screen.findByRole('option', { name: 'NRT - 나리타' });
  fireEvent.change(screen.getByLabelText('도착 공항'), { target: { value: 'NRT' } });
  await waitFor(() => expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('이전에 불러온 자료');
  expect(screen.getAllByText('BX164')).toHaveLength(1);
  expect(screen.getByText(/자료 기준:/)).toHaveTextContent('2025');
});

it('keeps the destination disabled until routes arrive and avoids duplicating unknown airport codes', async () => {
  getSchedule.mockResolvedValue({ ...fixture, flights: [{ ...fixture.flights[0], destination: 'XYZ' }] });
  render(<FlightScheduleSearch />);
  const arrival = screen.getByRole('combobox', { name: '도착 공항' });
  expect(arrival).toBeDisabled();
  expect(arrival).toHaveAccessibleDescription('출발 공항을 먼저 선택하세요.');
  fireEvent.change(screen.getByLabelText('출발 공항'), { target: { value: 'PUS' } });
  expect(await screen.findByRole('option', { name: 'XYZ' })).toBeInTheDocument();
  expect(arrival).toBeEnabled();
  expect(screen.queryByRole('option', { name: 'XYZ - XYZ' })).not.toBeInTheDocument();
});
