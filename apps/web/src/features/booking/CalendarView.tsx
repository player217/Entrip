'use client'

import React from 'react'
import { Icon } from '@entrip/ui'

// 샘플 더미 데이터
const SAMPLE_BOOKINGS = [
  {
    id: '1',
    customerName: '김철수',
    teamName: '부산 가족여행',
    destination: '부산',
    startDate: new Date(2025, 6, 5),
    endDate: new Date(2025, 6, 7),
    status: 'confirmed',
    paxCount: 4,
    color: '#3B82F6'
  },
  {
    id: '2',
    customerName: '이영희',
    teamName: '제주도 신혼여행',
    destination: '제주도',
    startDate: new Date(2025, 6, 12),
    endDate: new Date(2025, 6, 15),
    status: 'pending',
    paxCount: 2,
    color: '#F59E0B'
  },
  {
    id: '3',
    customerName: '박민수',
    teamName: '일본 오사카',
    destination: '오사카',
    startDate: new Date(2025, 6, 20),
    endDate: new Date(2025, 6, 24),
    status: 'confirmed',
    paxCount: 6,
    color: '#10B981'
  }
]

export function CalendarView() {
  const currentMonth = new Date(2025, 6) // 2025년 7월
  const daysInMonth = new Date(2025, 7, 0).getDate()
  const firstDayOfMonth = new Date(2025, 6, 1).getDay()

  const getBookingsForDate = (date: number) => {
    return SAMPLE_BOOKINGS.filter(booking => {
      const bookingDate = new Date(2025, 6, date)
      return bookingDate >= booking.startDate && bookingDate <= booking.endDate
    })
  }

  return (
    <div>
      {/* 캘린더 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon icon="ph:caret-left-bold" className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
          </h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon icon="ph:caret-right-bold" className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            예약 추가
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div 
            key={day} 
            className={`p-3 text-center text-sm font-medium ${
              idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7">
        {/* 빈 날짜 채우기 */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[120px] p-2 border-r border-b border-gray-200" />
        ))}
        
        {/* 실제 날짜 */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const date = idx + 1
          const bookings = getBookingsForDate(date)
          const isWeekend = (firstDayOfMonth + idx) % 7 === 0 || (firstDayOfMonth + idx) % 7 === 6
          
          return (
            <div 
              key={date} 
              className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                isWeekend ? 'bg-gray-50' : ''
              }`}
            >
              <div className="font-medium text-sm mb-1">{date}</div>
              <div className="space-y-1">
                {bookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: booking.color, color: 'white' }}
                    title={`${booking.teamName} (${booking.paxCount}명)`}
                  >
                    <div className="truncate font-medium">{booking.teamName}</div>
                    <div className="truncate opacity-90">{booking.destination}</div>
                  </div>
                ))}
                {bookings.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{bookings.length - 3} 더보기
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 통계 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-gray-900">{SAMPLE_BOOKINGS.length}</span>건의 예약
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded" />
              <span>확정</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span>대기</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded" />
              <span>취소</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}