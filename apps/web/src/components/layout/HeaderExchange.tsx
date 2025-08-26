'use client';

import { clsx } from 'clsx';
import { useExchangeRates, type Rate } from '../../hooks/useExchangeRates';
import { Skeleton } from '@entrip/ui';

const unitLabel: Record<Rate['unit'], string> = {
  USD: 'USD',
  EUR: 'EUR', 
  JPY: 'JPY',
  CNY: 'CNY'
};

export default function HeaderExchange() {
  const { data, isLoading, error } = useExchangeRates();

  if (isLoading) {
    return <Skeleton className="w-56 h-5" />;
  }

  if (error || !data || data.length === 0) {
    return (
      <span className="text-xs text-gray-300">
        환율 정보를 불러올 수 없습니다
      </span>
    );
  }

  return (
    <ul className="flex gap-4 text-sm font-semibold tracking-wide">
      {data.map(({ unit, rate, diff }) => (
        <li key={unit} className="flex items-center gap-1">
          <span>{unitLabel[unit]}</span>
          <span>{rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={clsx(
            'flex items-center',
            diff >= 0 ? 'text-green-300' : 'text-red-300'
          )}>
            {diff >= 0 ? '▲' : '▼'}
            {Math.abs(diff).toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}