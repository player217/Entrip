import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ChartCard } from '../src/components/compounds/ChartCard';

// Exercise the configuration passed to Recharts; dimensions are not available in jsdom.
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children, data, layout, accessibilityLayer }: any) => <div data-testid="chart" data-items={data.length} data-layout={layout} data-accessible={accessibilityLayer}>{children}</div>,
  Bar: ({ children }: any) => <div>{children}</div>,
  CartesianGrid: () => null,
  LabelList: () => null,
  XAxis: ({ type, allowDecimals, dataKey }: any) => <div data-testid="x-axis" data-type={type} data-decimals={allowDecimals} data-key={dataKey} />,
  YAxis: ({ type, allowDecimals, dataKey, interval }: any) => <div data-testid="y-axis" data-type={type} data-decimals={allowDecimals} data-key={dataKey} data-interval={interval} />,
  Tooltip: ({ formatter }: any) => <output data-testid="tooltip">{formatter(1234567.89).join(' : ')}</output>,
}));

it('uses integer ticks for booking counts while preserving decimal money axes', () => {
  const { rerender } = render(<ChartCard title="예약 건수" data={[{ name: '출장', value: 1 }]} integerValues />);
  expect(screen.getByTestId('y-axis')).toHaveAttribute('data-decimals', 'false');
  rerender(<ChartCard title="예약 금액" data={[{ name: '11월', value: 1234.5 }]} />);
  expect(screen.getByTestId('y-axis')).toHaveAttribute('data-decimals', 'true');
});

it('shows an exact formatted amount with a Korean metric name in the tooltip and accessible table', () => {
  render(<ChartCard title="예약 금액" data={[{ name: '11월', value: 1234567.89 }]} valueLabel="예약 금액" valueFormatter={value => `${value.toLocaleString('ko-KR')} 원`} />);
  expect(screen.getByTestId('tooltip')).toHaveTextContent('1,234,567.89 원 : 예약 금액');
  expect(within(screen.getByRole('table', { name: '예약 금액 데이터' })).getByRole('cell')).toHaveTextContent('1,234,567.89 원');
  expect(screen.getByTestId('chart')).toHaveAttribute('data-accessible', 'true');
});

it('keeps all managers in a keyboard-scrollable horizontal chart and a complete accessible table', () => {
  const data = Array.from({ length: 25 }, (_, i) => ({ name: `담당자 ${i + 1}`, value: i + 1 }));
  render(<ChartCard title="담당자별 예약 건수" data={data} integerValues orientation="horizontal" height={940} maxHeight={340} valueLabel="건수" />);
  expect(screen.getByTestId('chart')).toHaveAttribute('data-items', '25');
  expect(screen.getByTestId('chart')).toHaveAttribute('data-layout', 'vertical');
  expect(screen.getByTestId('x-axis')).toHaveAttribute('data-type', 'number');
  expect(screen.getByTestId('x-axis')).toHaveAttribute('data-decimals', 'false');
  expect(screen.getByTestId('y-axis')).toHaveAttribute('data-key', 'name');
  expect(screen.getByTestId('y-axis')).toHaveAttribute('data-interval', '0');
  expect(screen.getByRole('region', { name: '담당자별 예약 건수' })).toHaveAttribute('tabindex', '0');
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
  expect(within(screen.getByRole('table')).getByRole('rowheader', { name: '담당자 25' })).toBeInTheDocument();
});
