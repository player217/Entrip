import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartCardProps {
  title: string;
  data: ChartData[];
  className?: string;
  height?: number;
  color?: string;
  dataKey?: string;
  xAxisKey?: string;
  /** Keep count axes on whole numbers without changing money/decimal charts. */
  integerValues?: boolean;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  orientation?: 'vertical' | 'horizontal';
  maxHeight?: number;
}

export const ChartCard = ({
  title,
  data,
  className,
  height = 240,
  color = 'var(--color-brand-500)',
  dataKey = 'value',
  xAxisKey = 'name',
  integerValues = false,
  valueLabel = '값',
  valueFormatter = (value: number) => value.toLocaleString('ko-KR'),
  orientation = 'vertical',
  maxHeight
}: ChartCardProps) => {
  const horizontal = orientation === 'horizontal';
  const scrollable = maxHeight !== undefined && height > maxHeight;
  const peak = data.reduce((max, item) => Math.max(max, Number(item[dataKey]) || 0), 0);
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <Card variant="elevated" className={`operations-chart ${className || ''}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {scrollable && <p className="entrip-no-print mb-2 text-xs text-gray-500">전체 {data.length}개 항목 · 아래로 스크롤해 모두 확인하세요.</p>}
        <div
          role="region"
          aria-label={title}
          tabIndex={scrollable ? 0 : undefined}
          className="chart-plot min-w-0 overflow-y-auto rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          style={{ maxHeight }}
        >
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} accessibilityLayer margin={{ top: 10, right: horizontal ? 44 : 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey={horizontal ? undefined : xAxisKey}
              type={horizontal ? 'number' : 'category'}
              allowDecimals={!integerValues}
              tickFormatter={horizontal ? formatValue : undefined}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              hide={false}
              dataKey={horizontal ? xAxisKey : undefined}
              type={horizontal ? 'category' : 'number'}
              width={horizontal ? 112 : 60}
              interval={horizontal ? 0 : undefined}
              allowDecimals={!integerValues}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={horizontal ? undefined : formatValue}
            />
            <Tooltip 
              formatter={(value: number) => [valueFormatter(value), valueLabel]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <Bar 
              dataKey={dataKey} 
              name={valueLabel}
              fill={color} 
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={horizontal ? 24 : 60}
            >
              {horizontal && <LabelList dataKey={dataKey} position="right" formatter={valueFormatter} fill="#4b5563" fontSize={12} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        <table className="chart-print-data sr-only">
          <caption>{title} 데이터</caption>
          <thead><tr><th scope="col">항목</th><th scope="col">{valueLabel}</th></tr></thead>
          <tbody>{data.map((item, index) => {
            const value = Number(item[dataKey]);
            return <tr key={index}>
              <th scope="row">{item[xAxisKey]}</th>
              <td>
                <span className="chart-print-bar" aria-hidden="true" style={{ width: `${peak > 0 ? Math.max(0, value) / peak * 100 : 0}%` }} />
                <span>{valueFormatter(value)}</span>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </CardContent>
    </Card>
  );
};
