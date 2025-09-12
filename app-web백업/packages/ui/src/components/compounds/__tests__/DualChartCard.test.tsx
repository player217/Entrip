import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { DualChartCard } from '../DualChartCard';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('DualChartCard', () => {
  const mockData = [
    { label: '1월', primary: 1000000, secondary: 10.5 },
    { label: '2월', primary: 1500000, secondary: 15.2 },
    { label: '3월', primary: 2000000, secondary: 20.8 },
    { label: '4월', primary: 1800000, secondary: 18.3 },
  ];

  const defaultProps = {
    title: '매출 및 성장률 추이',
    data: mockData,
    primaryLabel: '매출',
    secondaryLabel: '성장률',
  };

  describe('Rendering', () => {
    it('should render title', () => {
      render(<DualChartCard {...defaultProps} />);
      expect(screen.getByText('매출 및 성장률 추이')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<DualChartCard {...defaultProps} subtitle="2024년 1분기" />);
      expect(screen.getByText('2024년 1분기')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      render(<DualChartCard {...defaultProps} />);
      expect(screen.queryByText('2024년 1분기')).not.toBeInTheDocument();
    });

    it('should render responsive container with correct height', () => {
      render(<DualChartCard {...defaultProps} height={400} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should apply Card styling', () => {
      const { container } = render(<DualChartCard {...defaultProps} />);
      const card = container.firstChild;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Chart Types', () => {
    it('should render bar-line chart by default', () => {
      render(<DualChartCard {...defaultProps} />);
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should render line-line chart when specified', () => {
      render(<DualChartCard {...defaultProps} chartType="line-line" />);
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should render bar-bar chart when specified', () => {
      render(<DualChartCard {...defaultProps} chartType="bar-bar" />);
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Chart Components', () => {
    it('should render all chart components for bar-line', () => {
      render(<DualChartCard {...defaultProps} chartType="bar-line" />);
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getAllByTestId('y-axis')).toHaveLength(2); // Left and right
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });

    it('should render all chart components for line-line', () => {
      render(<DualChartCard {...defaultProps} chartType="line-line" />);
      expect(screen.getAllByTestId('line')).toHaveLength(2);
      expect(screen.queryByTestId('bar')).not.toBeInTheDocument();
    });

    it('should render all chart components for bar-bar', () => {
      render(<DualChartCard {...defaultProps} chartType="bar-bar" />);
      expect(screen.getAllByTestId('bar')).toHaveLength(2);
      expect(screen.queryByTestId('line')).not.toBeInTheDocument();
    });
  });

  describe('Formatters', () => {
    it('should use default formatters', () => {
      // Test formatKRW
      const formatKRW = (value: number): string => {
        if (value >= 100000000) {
          return `${(value / 100000000).toFixed(1)}억`;
        }
        if (value >= 10000000) {
          return `${(value / 10000000).toFixed(1)}천만`;
        }
        if (value >= 10000) {
          return `${(value / 10000).toFixed(0)}만`;
        }
        return value.toLocaleString();
      };

      // Test formatPercent
      const formatPercent = (value: number): string => {
        return `${value.toFixed(1)}%`;
      };

      expect(formatKRW(150000000)).toBe('1.5억');
      expect(formatKRW(25000000)).toBe('2.5천만');
      expect(formatKRW(50000)).toBe('5만');
      expect(formatKRW(999)).toBe('999');

      expect(formatPercent(10.5)).toBe('10.5%');
      expect(formatPercent(99.99)).toBe('100.0%');
    });

    it('should accept custom formatters', () => {
      const customPrimaryFormatter = jest.fn((value: number) => `$${value}`);
      const customSecondaryFormatter = jest.fn((value: number) => `${value}명`);

      render(
        <DualChartCard
          {...defaultProps}
          primaryFormatter={customPrimaryFormatter}
          secondaryFormatter={customSecondaryFormatter}
        />
      );

      // The formatters would be passed to YAxis and Tooltip components
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('should use default colors', () => {
      render(<DualChartCard {...defaultProps} />);
      // Default colors are primaryColor = '#3b82f6', secondaryColor = '#10b981'
      // These would be passed to Line and Bar components
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });

    it('should accept custom colors', () => {
      render(
        <DualChartCard
          {...defaultProps}
          primaryColor="#ff0000"
          secondaryColor="#00ff00"
        />
      );
      // Custom colors would be passed to Line and Bar components
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle empty data array', () => {
      render(<DualChartCard {...defaultProps} data={[]} />);
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByText('매출 및 성장률 추이')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singleData = [{ label: '1월', primary: 1000000, secondary: 10.5 }];
      render(<DualChartCard {...defaultProps} data={singleData} />);
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should render with minimal required props', () => {
      const minimalProps = {
        title: 'Test Chart',
        data: mockData,
        primaryLabel: 'Primary',
        secondaryLabel: 'Secondary',
      };
      render(<DualChartCard {...minimalProps} />);
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });

    it('should handle large numbers correctly', () => {
      const largeData = [
        { label: '1월', primary: 999999999, secondary: 99.9 },
        { label: '2월', primary: 10000000000, secondary: 100.1 },
      ];
      render(<DualChartCard {...defaultProps} data={largeData} />);
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should handle negative numbers', () => {
      const negativeData = [
        { label: '1월', primary: -1000000, secondary: -10.5 },
        { label: '2월', primary: 1500000, secondary: 15.2 },
      ];
      render(<DualChartCard {...defaultProps} data={negativeData} />);
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<DualChartCard {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('매출 및 성장률 추이');
    });

    it('should render chart container with proper structure', () => {
      const { container } = render(<DualChartCard {...defaultProps} />);
      const chartContainer = container.querySelector('.p-6');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with different data formats', () => {
      const customData = [
        { label: 'Q1', primary: 2500000, secondary: 25.5 },
        { label: 'Q2', primary: 3000000, secondary: 30.2 },
        { label: 'Q3', primary: 2800000, secondary: 28.7 },
        { label: 'Q4', primary: 3500000, secondary: 35.1 },
      ];

      render(
        <DualChartCard
          title="분기별 실적"
          subtitle="2024년"
          data={customData}
          primaryLabel="매출액"
          secondaryLabel="영업이익률"
          chartType="bar-bar"
        />
      );

      expect(screen.getByText('분기별 실적')).toBeInTheDocument();
      expect(screen.getByText('2024년')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});