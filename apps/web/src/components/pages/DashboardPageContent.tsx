'use client'

import { useMemo } from 'react'
import { ChartCard } from '@entrip/ui'
import { useBookings } from '../../hooks/useBookings'
import { buildDashboardStats, money } from '../../lib/bookingAnalytics'
import { TodayBookingsSection } from '../dashboard/sections/TodayBookingsSection'
import { RealTimeAlertsSection } from '../dashboard/sections/RealTimeAlertsSection'
import { ActiveTeamsSection } from '../dashboard/sections/ActiveTeamsSection'

export default function DashboardPageContent() {
  const { bookings: apiBookings, isLoading, isError, mutate } = useBookings()

  const dashboardStats = useMemo(() => buildDashboardStats(apiBookings), [apiBookings])

  // 로딩 및 에러 처리
  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>
  }

  if (isError) {
    return <div className="flex justify-center items-center h-64 text-red-500">데이터 로딩 오류</div>
  }

  const changePercentage = dashboardStats.yesterdayBookings > 0
    ? Math.round(((dashboardStats.todayBookings - dashboardStats.yesterdayBookings) / dashboardStats.yesterdayBookings) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => void mutate()} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
            새로고침
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            예약 자료 기준
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-500">취소 예약은 제외합니다. 금액은 원화 예약만 합산하며, 외화 {dashboardStats.excludedCurrencyCount}건은 합산하지 않습니다. 예약 금액은 실제 입금액과 다릅니다.</p>
      {/* 요약 KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">오늘 출발</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{dashboardStats.todayBookings}건</p>
              {changePercentage !== 0 && (
                <p className={`text-sm mt-1 ${changePercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {changePercentage > 0 ? '+' : ''}{changePercentage}% 전일 대비
                </p>
              )}
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              📅
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">확정 예약</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{dashboardStats.confirmedBookings}건</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              ✅
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">대기 예약</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{dashboardStats.pendingBookings}건</p>
              {dashboardStats.pendingBookings > 0 && (
                <p className="text-sm text-yellow-600 mt-1">처리 필요</p>
              )}
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              ⏳
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">최근 4개월 예약 금액 (KRW)</h3>
              <p className="text-xl xl:text-2xl font-semibold text-gray-900 tabular-nums whitespace-nowrap mt-2">
                {money(dashboardStats.monthlyRevenue.reduce((sum, item) => sum + item.value, 0))}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* 실시간 정보 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TodayBookingsSection />
        <RealTimeAlertsSection />
      </div>

      {/* 진행 상황 섹션 */}
      <div className="mb-8">
        <ActiveTeamsSection />
      </div>

      {/* 차트 및 분석 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="월별 예약 금액 (KRW)"
          data={dashboardStats.monthlyRevenue}
          valueLabel="예약 금액"
          valueFormatter={money}
          height={300}
          className=""
        />
        <ChartCard
          title="예약 유형별 현황"
          data={dashboardStats.typeStats}
          valueLabel="예약 건수"
          valueFormatter={(value: number) => `${value.toLocaleString('ko-KR')}건`}
          integerValues
          height={300}
          color="var(--color-info)"
          className=""
        />
      </div>
    </div>
  )
}
