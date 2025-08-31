'use client'

import { useState, useMemo } from 'react'
import { Icon, Button } from '@entrip/ui'
import { Booking, logger } from '@entrip/shared'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { NewTeamModal } from '@entrip/ui'
import { useBookings } from '../../hooks/useBookings'
import { getBookingDate, priceOf, getPaxCount, getCustomerName } from '@/utils/booking-helpers'

export default function MainPageContent() {
  const [showEventModal, setShowEventModal] = useState(false)
  
  // Fetch real bookings data for current month
  const currentDate = new Date()
  const monthParam = format(currentDate, 'yyyy-MM')
  const { bookings } = useBookings(monthParam)

  // Calculate real summary data from bookings
  const summaryData = useMemo(() => {
    // Filter bookings for current month
    const currentMonthBookings = bookings.filter((booking: Booking) => {
      const bookingDate = getBookingDate(booking)
      return bookingDate && bookingDate.getMonth() === currentDate.getMonth() && 
             bookingDate.getFullYear() === currentDate.getFullYear()
    })
    
    // Filter bookings for current week
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6)
    
    const currentWeekBookings = bookings.filter((booking: Booking) => {
      const bookingDate = getBookingDate(booking)
      return bookingDate && bookingDate >= startOfWeek && bookingDate <= endOfWeek
    })
    
    const totalBookings = currentMonthBookings.length
    const weeklyBookings = currentWeekBookings.length
    const totalRevenue = currentMonthBookings.reduce((sum: number, booking: Booking) => {
      return sum + priceOf(booking)
    }, 0)
    const avgRevenue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0
    
    return {
      totalBookings,
      weeklyBookings,
      totalRevenue: totalRevenue.toLocaleString('ko-KR'),
      avgRevenue: avgRevenue.toLocaleString('ko-KR')
    }
  }, [bookings, currentDate])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Dashboard Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-600 mt-1">
              {format(currentDate, 'yyyy년 M월', { locale: ko })} 예약 현황
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={"secondary" as const}
              size={"sm" as const}
              onClick={() => {
                // TODO: Implement export functionality
              }}
            >
              <Icon icon="ph:download-simple" className="w-4 h-4 mr-1" />
              내보내기
            </Button>
            <Button
              variant={"primary" as const}
              size={"sm" as const}
              onClick={() => setShowEventModal(true)}
            >
              <Icon icon="ph:plus" className="w-4 h-4 mr-1" />
              새 예약
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 총 예약 수 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Icon icon="ph:calendar-check" className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 예약</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryData.totalBookings}팀</p>
              </div>
            </div>
          </div>

          {/* 총 매출 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Icon icon="ph:currency-krw" className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-2xl font-semibold text-gray-900">₩{summaryData.totalRevenue}</p>
              </div>
            </div>
          </div>

          {/* 평균 매출 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Icon icon="ph:trend-up" className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 매출</p>
                <p className="text-2xl font-semibold text-gray-900">₩{summaryData.avgRevenue}</p>
              </div>
            </div>
          </div>

          {/* 이번 주 예약 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <Icon icon="ph:clock" className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">이번 주</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryData.weeklyBookings}팀</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">최근 예약</h3>
          </div>
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.slice(0, 10).map((booking: Booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Icon icon="ph:users" className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {booking.customerName || booking.teamName || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.destination} • {getPaxCount(booking)}명
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ₩{priceOf(booking).toLocaleString('ko-KR')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          const bookingDate = getBookingDate(booking);
                          return bookingDate ? format(bookingDate, 'M/d', { locale: ko }) : '-';
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Icon icon="ph:calendar-x" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">예약 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal */}
      <NewTeamModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSave={(data) => {
          logger.info('New team data:', JSON.stringify(data));
          // TODO: API 호출 또는 store 업데이트
          setShowEventModal(false);
        }}
        selectedDate={''}
      />
    </div>
  )
}