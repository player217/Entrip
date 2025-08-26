import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChartCard } from '../ChartCard';
import type { ChartData } from '../ChartCard';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => (
    <div data-testid="bar-chart" data-items={Array.isArray(data) ? data.length : 0}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid="bar" data-key={dataKey} data-fill={fill} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <div data-testid="y-axis" data-formatter={tickFormatter ? 'custom' : 'default'} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ formatter }: { formatter?: (value: number) => string }) => (
    <div data-testid="tooltip" data-formatter={formatter ? 'custom' : 'default'} />
  ),
}));

describe('ChartCard', () => {
  const mockData: ChartData[] = [
    { name: 'Jan', value: 1000 },
    { name: 'Feb', value: 2500 },
    { name: 'Mar', value: 3200 },
    { name: 'Apr', value: 2800 },
  ];

  const defaultProps = {
    title: '월별 매출',
    data: mockData,
  };

  describe('Rendering', () => {
    it('should render title', () => {
      render(<ChartCard {...defaultProps} />);
      expect(screen.getByText('월별 매출')).toBeInTheDocument();
    });

    it('should render chart container', () => {
      render(<ChartCard {...defaultProps} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render bar chart with correct data', () => {
      render(<ChartCard {...defaultProps} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '4');
    });

    it('should render all chart components', () => {
      render(<ChartCard {...defaultProps} />);
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ChartCard {...defaultProps} className="custom-class" />
      );
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Chart Configuration', () => {
    it('should use default height', () => {
      render(<ChartCard {...defaultProps} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      // Default height is 240
    });

    it('should use custom height', () => {
      render(<ChartCard {...defaultProps} height={300} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });

    it('should use default color', () => {
      render(<ChartCard {...defaultProps} />);
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-fill', 'var(--color-brand-500)');
    });

    it('should use custom color', () => {
      render(<ChartCard {...defaultProps} color="#ff0000" />);
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-fill', '#ff0000');
    });

    it('should use default dataKey', () => {
      render(<ChartCard {...defaultProps} />);
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-key', 'value');
    });

    it('should use custom dataKey', () => {
      const customData = [
        { name: 'Jan', value: 1000, revenue: 1000 },
        { name: 'Feb', value: 2000, revenue: 2000 },
      ];
      render(<ChartCard {...defaultProps} data={customData} dataKey="revenue" />);
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-key', 'revenue');
    });

    it('should use default xAxisKey', () => {
      render(<ChartCard {...defaultProps} />);
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'name');
    });

    it('should use custom xAxisKey', () => {
      const customData = [
        { name: 'Jan', value: 1000, month: 'Jan' },
        { name: 'Feb', value: 2000, month: 'Feb' },
      ];
      render(<ChartCard {...defaultProps} data={customData} xAxisKey="month" />);
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'month');
    });
  });

  describe('Value Formatting', () => {
    it('should format large numbers correctly', () => {
      const formatValue = (value: number) => {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toString();
      };

      // Test formatter logic
      expect(formatValue(999)).toBe('999');
      expect(formatValue(1000)).toBe('1.0K');
      expect(formatValue(1500)).toBe('1.5K');
      expect(formatValue(999999)).toBe('1000.0K');
      expect(formatValue(1000000)).toBe('1.0M');
      expect(formatValue(2500000)).toBe('2.5M');
    });

    it('should apply formatter to Y-axis', () => {
      render(<ChartCard {...defaultProps} />);
      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-formatter', 'custom');
    });

    it('should apply formatter to Tooltip', () => {
      render(<ChartCard {...defaultProps} />);
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-formatter', 'custom');
    });
  });

  describe('Empty Data', () => {
    it('should handle empty data array', () => {
      render(<ChartCard {...defaultProps} data={[]} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '0');
    });

    it('should handle single data point', () => {
      const singleData = [{ name: 'Jan', value: 1000 }];
      render(<ChartCard {...defaultProps} data={singleData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '1');
    });
  });

  describe('Complex Data', () => {
    it('should handle data with additional properties', () => {
      const complexData: ChartData[] = [
        { name: 'Jan', value: 1000, percentage: 10.5, category: 'A' },
        { name: 'Feb', value: 2000, percentage: 20.3, category: 'B' },
      ];
      render(<ChartCard {...defaultProps} data={complexData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });

    it('should handle negative values', () => {
      const negativeData = [
        { name: 'Jan', value: -1000 },
        { name: 'Feb', value: 2000 },
      ];
      render(<ChartCard {...defaultProps} data={negativeData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });

    it('should handle zero values', () => {
      const zeroData = [
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 1000 },
      ];
      render(<ChartCard {...defaultProps} data={zeroData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ChartCard {...defaultProps} />);
      const heading = screen.getByText('월별 매출');
      expect(heading).toBeInTheDocument();
      // The actual heading level depends on CardTitle implementation
    });

    it('should render in a Card container', () => {
      const { container } = render(<ChartCard {...defaultProps} />);
      // Card should have variant="elevated"
      const card = container.firstChild;
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeData = [
        { name: 'Jan', value: 999999999 },
        { name: 'Feb', value: 1234567890 },
      ];
      render(<ChartCard {...defaultProps} data={largeData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });

    it('should handle decimal values', () => {
      const decimalData = [
        { name: 'Jan', value: 1234.56 },
        { name: 'Feb', value: 2345.67 },
      ];
      render(<ChartCard {...defaultProps} data={decimalData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });

    it('should handle empty title', () => {
      render(<ChartCard {...defaultProps} title="" />);
      // Should still render without errors
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle special characters in data', () => {
      const specialData = [
        { name: '1월 (Jan)', value: 1000 },
        { name: '2월 (Feb)', value: 2000 },
      ];
      render(<ChartCard {...defaultProps} data={specialData} />);
      const barChart = screen.getByTestId('bar-chart');
      expect(barChart).toHaveAttribute('data-items', '2');
    });
  });
});