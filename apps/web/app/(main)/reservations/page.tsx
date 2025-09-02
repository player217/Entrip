'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import MonthlyCalendarView from '@/features/calendar/MonthlyCalendarView'
import WeekView from '@/features/calendar/WeekView'
import MonthlyListPage from '@/features/calendar/MonthlyListPage'
import WeeklyListPage from '@/features/calendar/WeeklyListPage'

export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<'calendar-month' | 'calendar-week' | 'monthly-list' | 'weekly-list'>('calendar-month')

  return (
    <div className="p-6 h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">예약 관리</h1>
          <p className="text-gray-600">예약 현황을 캘린더와 리스트로 확인하세요.</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar-month')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'calendar-month'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            월별 캘린더
          </button>
          <button
            onClick={() => setActiveTab('calendar-week')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'calendar-week'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            주별 캘린더
          </button>
          <button
            onClick={() => setActiveTab('monthly-list')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'monthly-list'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            월별 리스트
          </button>
          <button
            onClick={() => setActiveTab('weekly-list')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'weekly-list'
                ? 'border-blue-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            주별 리스트
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="flex-1 h-full">
        {activeTab === 'calendar-month' && <MonthlyCalendarView />}
        {activeTab === 'calendar-week' && (
          <div className="h-[600px]">
            <WeekView currentDate={new Date()} />
          </div>
        )}
        {activeTab === 'monthly-list' && <MonthlyListPage />}
        {activeTab === 'weekly-list' && <WeeklyListPage />}
      </div>
    </div>
  )
}