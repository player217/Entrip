'use client'

import React from 'react'

const currencyPairs = [
  { code: 'USD', value: 1325.50, diff: +2.3 },
  { code: 'EUR', value: 1440.30, diff: -0.8 },
  { code: 'JPY', value: 8.95, diff: +0.1 },
  { code: 'CNY', value: 182.30, diff: +0.8 },
]

interface ExchangeTickerProps {
  className?: string
}

export function ExchangeTicker({ className = '' }: ExchangeTickerProps) {
  return (
    <ul className={`flex gap-4 text-sm font-semibold tracking-wide ${className}`}>
      {currencyPairs.map(pair => (
        <li key={pair.code} className="flex items-center gap-1">
          <span>{pair.code}</span>
          <span>{pair.value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`flex items-center ${pair.diff >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {pair.diff >= 0 ? '▲' : '▼'}
            {Math.abs(pair.diff).toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  )
}