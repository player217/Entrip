'use client'

import { useMemo } from 'react'
import { ChartCard } from '@entrip/ui'
import { useBookings } from '../../hooks/useBookings'
import { format, isToday, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TodayBookingsSection } from '../dashboard/sections/TodayBookingsSection'
import { RealTimeAlertsSection } from '../dashboard/sections/RealTimeAlertsSection'
import { ActiveTeamsSection } from '../dashboard/sections/ActiveTeamsSection'

export default function DashboardPageContent() {
  const { bookings: apiBookings, isLoading, isError } = useBookings()

  // 실제 통계 데이터 계산
  const dashboardStats = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return {
        todayBookings: 0,
        yesterdayBookings: 0,
        confirmedBookings: 0,
        pendingBookings: 0,
        monthlyRevenue: [],
        typeStats: []
      }
    }

    const today = new Date()
    const yesterday = subDays(today, 1)
    const todayStr = format(today, 'yyyy-MM-dd')
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

    // 금일 예약 수
    const todayBookings = apiBookings.filter((booking: any) => 
      booking.startDate === todayStr
    ).length

    // 전일 예약 수
    const yesterdayBookings = apiBookings.filter((booking: any) => 
      booking.startDate === yesterdayStr
    ).length

    // 상태별 집계
    const confirmedBookings = apiBookings.filter((booking: any) => 
      booking.status === 'confirmed'
    ).length

    const pendingBookings = apiBookings.filter((booking: any) => 
      booking.status === 'pending'
    ).length

    // 월별 매출 데이터 생성 (최근 4개월)
    const monthlyRevenue = []
    for (let i = 3; i >= 0; i--) {
      const targetDate = new Date()
      targetDate.setMonth(targetDate.getMonth() - i)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)
      const monthName = format(targetDate, 'M월', { locale: ko })

      const monthlyBookings = apiBookings.filter((booking: any) => {
        const bookingDate = new Date(booking.startDate)
        return bookingDate >= monthStart && bookingDate <= monthEnd
      })

      const totalRevenue = monthlyBookings.reduce((sum: number, booking: any) => 
        sum + Number(booking.totalPrice || 0), 0
      )

      monthlyRevenue.push({ name: monthName, value: totalRevenue })
    }

    // 목적지별 타입 통계
    const typeMapping = {
      '골프': 0,
      '인센티브': 0,
      '허니문': 0,
      '에어텔': 0
    }

    apiBookings.forEach((booking: any) => {
      const destination = booking.destination || ''
      if (destination.includes('골프') || destination.includes('Golf')) {
        typeMapping['골프']++
      } else if (destination.includes('일본') || destination.includes('태국') || 
                 destination.includes('베트남') || destination.includes('싱가포르') || 
                 destination.includes('홍콩') || destination.includes('필리핀') || 
                 destination.includes('대만')) {
        typeMapping['인센티브']++
      } else if (destination.includes('신혼')) {
        typeMapping['허니문']++
      } else {
        typeMapping['에어텔']++
      }
    })

    const typeStats = Object.entries(typeMapping).map(([name, value]) => ({ name, value }))

    return {
      todayBookings,
      yesterdayBookings,
      confirmedBookings,
      pendingBookings,
      monthlyRevenue,
      typeStats
    }
  }, [apiBookings])

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
          <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
            새로고침
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            실시간
          </div>
        </div>
      </div>
      
      {/* 요약 KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">금일 예약</h3>
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
              <h3 className="text-sm font-medium text-gray-500">총 매출</h3>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                {dashboardStats.monthlyRevenue.reduce((sum, item) => sum + item.value, 0).toLocaleString()}원
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
          title="월별 매출 현황" 
          data={dashboardStats.monthlyRevenue}
          height={300}
          className=""
        />
        <ChartCard 
          title="예약 유형별 현황" 
          data={dashboardStats.typeStats}
          height={300}
          color="var(--color-info)"
          className=""
        />
      </div>
    </div>
  )
}