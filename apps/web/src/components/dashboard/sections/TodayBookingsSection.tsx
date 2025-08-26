'use client'

import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useBookings } from '../../../hooks/useBookings'
import type { Booking } from '@entrip/shared'

interface DepartureTeam {
  id: string
  teamName: string
  destination: string
  paxCount: number
  departureTime: string
  manager: string
  status: 'confirmed' | 'checking' | 'delayed'
}

interface NewBookingToday {
  id: string
  teamName: string
  destination: string
  customerName: string
  totalPrice: number
  createdTime: string
}

export function TodayBookingsSection() {
  const { bookings: apiBookings, isLoading } = useBookings()

  const todayData = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return {
        departures: [],
        newBookings: [],
        pendingCount: 0
      }
    }

    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')

    // 오늘 출발하는 팀들
    const departures: DepartureTeam[] = apiBookings
      .filter((booking: Booking) => booking.startDate === todayStr)
      .map((booking: Booking) => ({
        id: booking.id,
        teamName: booking.teamName,
        destination: booking.destination,
        paxCount: booking.paxCount,
        departureTime: '09:00', // 임시값 - 실제로는 booking에서 가져와야 함
        manager: booking.user?.name || '미정',
        status: booking.status === 'CONFIRMED' ? 'confirmed' : 'checking'
      }))

    // 오늘 등록된 신규 예약 (createdAt 기준)
    const newBookings: NewBookingToday[] = apiBookings
      .filter((booking: Booking) => {
        const createdDate = new Date(booking.createdAt)
        return isToday(createdDate)
      })
      .map((booking: Booking) => ({
        id: booking.id,
        teamName: booking.teamName,
        destination: booking.destination,
        customerName: booking.customerName,
        totalPrice: booking.totalPrice,
        createdTime: format(new Date(booking.createdAt), 'HH:mm')
      }))

    // 대기 중인 예약 수
    const pendingCount = apiBookings.filter(
      (booking: Booking) => booking.status === 'PENDING'
    ).length

    return {
      departures,
      newBookings,
      pendingCount
    }
  }, [apiBookings])

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">오늘의 예약 현황</h3>
        <span className="text-sm text-gray-500">
          {format(new Date(), 'M월 d일', { locale: ko })}
        </span>
      </div>

      <div className="space-y-6">
        {/* 오늘 출발하는 팀들 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            오늘 출발 ({todayData.departures.length}팀)
          </h4>
          {todayData.departures.length > 0 ? (
            <div className="space-y-2">
              {todayData.departures.slice(0, 3).map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      team.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{team.teamName}</p>
                      <p className="text-xs text-gray-600">{team.destination} · {team.paxCount}명</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">{team.departureTime}</p>
                    <p className="text-xs text-gray-500">{team.manager}</p>
                  </div>
                </div>
              ))}
              {todayData.departures.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{todayData.departures.length - 3}개 팀 더보기
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3">오늘 출발하는 팀이 없습니다.</p>
          )}
        </div>

        {/* 오늘 등록된 신규 예약 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            신규 예약 ({todayData.newBookings.length}건)
          </h4>
          {todayData.newBookings.length > 0 ? (
            <div className="space-y-2">
              {todayData.newBookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{booking.teamName}</p>
                    <p className="text-xs text-gray-600">{booking.customerName} · {booking.destination}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">{booking.totalPrice.toLocaleString()}원</p>
                    <p className="text-xs text-gray-500">{booking.createdTime}</p>
                  </div>
                </div>
              ))}
              {todayData.newBookings.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{todayData.newBookings.length - 3}건 더보기
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3">오늘 등록된 신규 예약이 없습니다.</p>
          )}
        </div>

        {/* 처리 대기 중인 업무 */}
        {todayData.pendingCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <h4 className="text-sm font-medium text-yellow-800">
                처리 대기 중 ({todayData.pendingCount}건)
              </h4>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              확정 대기 중인 예약이 {todayData.pendingCount}건 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}