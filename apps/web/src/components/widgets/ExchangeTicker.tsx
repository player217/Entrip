'use client'

import React from 'react'
import useSWR from 'swr'
import { Icon } from '@entrip/ui'

interface ExchangeRate {
  USD: number
  EUR: number
  JPY: number
  CNY: number
}

const MOCK_RATES: ExchangeRate = {
  USD: 1320.50,
  EUR: 1440.30,
  JPY: 8.95,
  CNY: 183.20
}

const fetcher = async (_url: string) => {
  // TODO: 실제 API 연동 시 활성화
  // const res = await fetch(url)
  // if (!res.ok) throw new Error('Failed to fetch')
  // return res.json()
  
  // Mock 데이터 반환
  return new Promise<ExchangeRate>((resolve) => {
    setTimeout(() => resolve(MOCK_RATES), 100)
  })
}

export function ExchangeTicker() {
  const { data: rates, error } = useSWR<ExchangeRate>(
    '/api/v1/forex/rates',
    fetcher,
    {
      refreshInterval: 15 * 60 * 1000, // 15분
      revalidateOnFocus: false
    }
  )

  if (error) return null
  if (!rates) return <ExchangeTickerSkeleton />

  return (
    <div className="flex items-center gap-4 text-sm">
      <ExchangeItem currency="USD" rate={rates.USD} />
      <ExchangeItem currency="EUR" rate={rates.EUR} />
      <ExchangeItem currency="JPY" rate={rates.JPY} />
      <ExchangeItem currency="CNY" rate={rates.CNY} />
    </div>
  )
}

interface ExchangeItemProps {
  currency: string
  rate: number
}

function ExchangeItem({ currency, rate }: ExchangeItemProps) {
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'USD': return 'ph:currency-dollar'
      case 'EUR': return 'ph:currency-eur'
      case 'JPY': return 'ph:currency-jpy'
      case 'CNY': return 'ph:currency-cny'
      default: return 'ph:currency-circle-dollar'
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <Icon 
        icon={getCurrencyIcon(currency)} 
        className="w-4 h-4 text-gray-500"
      />
      <span className="font-medium text-gray-700">{currency}</span>
      <span className="text-gray-600">
        {rate.toLocaleString('ko-KR', { 
          minimumFractionDigits: currency === 'JPY' ? 2 : 0,
          maximumFractionDigits: currency === 'JPY' ? 2 : 0
        })}
      </span>
    </div>
  )
}

function ExchangeTickerSkeleton() {
  return (
    <div className="flex items-center gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
          <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}