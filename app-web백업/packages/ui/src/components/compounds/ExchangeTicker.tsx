'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { clsx } from 'clsx';

export interface ExchangeRate {
  currency: string;
  symbol: string;
  rate: number;
  change: number;
}

export interface ExchangeTickerProps {
  rates?: ExchangeRate[];
  onRefresh?: () => void;
  className?: string;
}

export const ExchangeTicker = ({
  rates = [],
  onRefresh,
  className
}: ExchangeTickerProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  // Mock 시계열 데이터
  const mockTimeSeriesData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: 1300 + Math.random() * 100
  }));

  const handleCurrencyClick = (currency: string) => {
    setSelectedCurrency(currency);
    setShowChart(true);
  };

  return (
    <>
      <div className={clsx('flex items-center space-x-2', className)}>
        {rates.map((rate) => (
          <button
            key={rate.currency}
            onClick={() => handleCurrencyClick(rate.currency)}
            className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium">{rate.currency}</span>
            <span className="text-sm">{rate.rate.toFixed(2)}</span>
            <span className={clsx(
              'text-xs',
              rate.change > 0 ? 'text-danger' : 'text-info'
            )}>
              {rate.change > 0 ? '▲' : '▼'}
              {Math.abs(rate.change)}%
            </span>
          </button>
        ))}
        {onRefresh && (
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            새로고침
          </Button>
        )}
      </div>

      {/* 시계열 차트 모달 */}
      {showChart && selectedCurrency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>{selectedCurrency} 환율 추이</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowChart(false)}
                className="absolute top-4 right-4"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockTimeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-brand-500)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
