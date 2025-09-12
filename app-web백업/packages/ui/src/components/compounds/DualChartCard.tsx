import React from 'react';
import { Card } from '../primitives/Card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface DualChartData {
  label: string;
  primary: number;
  secondary: number;
}

interface DualChartCardProps {
  title: string;
  subtitle?: string;
  data: DualChartData[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryColor?: string;
  secondaryColor?: string;
  chartType?: 'line-line' | 'bar-bar' | 'bar-line';
  height?: number;
  primaryFormatter?: (value: number) => string;
  secondaryFormatter?: (value: number) => string;
}

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

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export function DualChartCard({
  title,
  subtitle,
  data,
  primaryLabel,
  secondaryLabel,
  primaryColor = '#3b82f6',
  secondaryColor = '#10b981',
  chartType = 'bar-line',
  height = 300,
  primaryFormatter = formatKRW,
  secondaryFormatter = formatPercent,
}: DualChartCardProps) {
  const renderChart = () => {
    switch (chartType) {
      case 'line-line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis yAxisId="left" tickFormatter={primaryFormatter} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={secondaryFormatter} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === primaryLabel) return primaryFormatter(value);
                return secondaryFormatter(value);
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="primary"
              stroke={primaryColor}
              name={primaryLabel}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="secondary"
              stroke={secondaryColor}
              name={secondaryLabel}
              strokeWidth={2}
            />
          </LineChart>
        );

      case 'bar-bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis yAxisId="left" tickFormatter={primaryFormatter} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={secondaryFormatter} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === primaryLabel) return primaryFormatter(value);
                return secondaryFormatter(value);
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="primary"
              fill={primaryColor}
              name={primaryLabel}
            />
            <Bar
              yAxisId="right"
              dataKey="secondary"
              fill={secondaryColor}
              name={secondaryLabel}
            />
          </BarChart>
        );

      case 'bar-line':
      default:
        return (
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis yAxisId="left" tickFormatter={primaryFormatter} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={secondaryFormatter} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === primaryLabel) return primaryFormatter(value);
                return secondaryFormatter(value);
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="primary"
              fill={primaryColor}
              name={primaryLabel}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="secondary"
              stroke={secondaryColor}
              name={secondaryLabel}
              strokeWidth={2}
            />
          </ComposedChart>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
}
