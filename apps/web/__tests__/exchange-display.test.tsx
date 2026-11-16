import React from 'react';
import { render, screen } from '@testing-library/react';
import HeaderExchange from '../src/components/layout/HeaderExchange';
import { useExchangeRates } from '../src/hooks/useExchangeRates';

jest.mock('../src/hooks/useExchangeRates', () => ({ useExchangeRates: jest.fn() }));
jest.mock('@entrip/ui', () => ({ Skeleton: () => <span>loading</span> }));

it('labels JPY as 100 yen and does not invent a daily change', () => {
  (useExchangeRates as jest.Mock).mockReturnValue({ data: [{ unit: 'JPY', rate: 9.5, diff: null }], isLoading: false });
  render(<HeaderExchange />);
  expect(screen.getByText('JPY(100)')).toBeInTheDocument();
  expect(screen.getByText('950.00')).toBeInTheDocument();
  expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
});

it('shows unavailable on source failure even if SWR retains stale data', () => {
  (useExchangeRates as jest.Mock).mockReturnValue({ data: [{ unit: 'USD', rate: 1000, diff: null }], error: new Error('503'), isLoading: false });
  render(<HeaderExchange />);
  expect(screen.getByText('환율 정보를 불러올 수 없습니다')).toBeInTheDocument();
  expect(screen.queryByText('1,000.00')).not.toBeInTheDocument();
});
