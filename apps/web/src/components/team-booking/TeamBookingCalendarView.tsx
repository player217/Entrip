'use client'

import { useState } from 'react'
import { Icon } from '@entrip/ui'
import { useTeamBookingCalendar } from '@entrip/shared/hooks/useTeamBooking'
import { NewTeamModal } from '@entrip/ui'
import type { TeamBooking } from '@entrip/shared/types/team-booking'
import { logger, BookingStatus } from '@entrip/shared'
import { createBooking } from '../../hooks/useBookings'

export function TeamBookingCalendarView() {
  const {
    // bookings, // TODO: Use for calendar display
    selectedMonth,
    isLoading,
    error,
    navigateMonth,
    goToToday,
    getBookingsByDate,
    clearError
  } = useTeamBookingCalendar()
  
  const [isNewTeamModalOpen, setIsNewTeamModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedBooking, setSelectedBooking] = useState<TeamBooking | null>(null)

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay()
  }

  const monthDays = getDaysInMonth(selectedMonth.year, selectedMonth.month)
  const firstDay = getFirstDayOfMonth(selectedMonth.year, selectedMonth.month)
  
  const monthName = new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long'
  })

  const handleDateClick = (day: number) => {
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(dateStr)
    setIsNewTeamModalOpen(true)
  }

  const renderBookingItem = (booking: TeamBooking) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    }

    const statusLabels = {
      draft: '예약대기',
      confirmed: '확정',
      in_progress: '진행중',
      completed: '완료',
      cancelled: '취소'
    }

    return (
      <div
        key={booking.id}
        className="mb-1 p-1 bg-white border border-gray-200 rounded cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => setSelectedBooking(booking)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">
              {booking.teamCode}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {booking.destination}
            </div>
          </div>
          <span className={`ml-1 px-1.5 py-0.5 text-xs rounded ${statusColors[booking.status]}`}>
            {statusLabels[booking.status]}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {booking.totalCount}명
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon icon="ph:warning" className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="ph:caret-left" className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">{monthName}</h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon icon="ph:caret-right" className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            오늘
          </button>
        </div>
        
        <button
          onClick={() => setIsNewTeamModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Icon icon="ph:plus" className="w-5 h-5" />
          신규 팀 등록
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Icon icon="ph:spinner" className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium ${
                    index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-32" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: monthDays }, (_, i) => {
                const day = i + 1
                const dateStr = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayBookings = getBookingsByDate(dateStr)
                const isToday = 
                  new Date().getFullYear() === selectedMonth.year &&
                  new Date().getMonth() + 1 === selectedMonth.month &&
                  new Date().getDate() === day

                return (
                  <div
                    key={day}
                    className={`h-32 border border-gray-200 rounded-lg p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isToday ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      {dayBookings.length > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {dayBookings.length}건
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-24">
                      {dayBookings.slice(0, 3).map(renderBookingItem)}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayBookings.length - 3}건 더보기
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewTeamModal
        isOpen={isNewTeamModalOpen}
        onClose={() => {
          setIsNewTeamModalOpen(false)
          setSelectedDate('')
        }}
        onSave={async (data) => {
          console.log('=== SAVE FUNCTION CALLED ===');
          console.log('=== NEW TEAM DATA ===', data);
          console.log('=== AFTER FIRST LOG ===');
          console.log('=== onSave function started ===');
          console.log('=== BEFORE TRY BLOCK ===');
          
          try {
            console.log('=== INSIDE TRY BLOCK ===');
            console.log('=== Entering try block ===');
            console.log('=== ABOUT TO CALL API ===');
            // API 호출하여 실제 예약 생성
            const bookingData = {
              teamCode: data.teamCode,
              teamName: data.teamName,
              tourName: data.teamName, // Using teamName as tourName since tourName doesn't exist on NewTeamPayload
              destination: data.destination,
              departureDate: data.departureDate,
              returnDate: data.returnDate,
              startDate: data.departureDate,
              endDate: data.returnDate,
              customerName: data.customerName,
              phone: data.customerPhone,
              totalCount: (data.adultCount || 0) + (data.childCount || 0) + (data.infantCount || 0),
              adultCount: data.adultCount || 0,
              childCount: data.childCount || 0,
              infantCount: data.infantCount || 0,
              nights: data.nights || 1,
              days: data.days || 2,
              totalPrice: (data.adultPrice || 0) * (data.adultCount || 0) + 
                         (data.childPrice || 0) * (data.childCount || 0) + 
                         0, // infantPrice doesn't exist on NewTeamPayload
              status: BookingStatus.CONFIRMED,
              paxCount: (data.adultCount || 0) + (data.childCount || 0) + (data.infantCount || 0),
              currency: 'KRW'
            };
            
            console.log('=== Calling createBooking with data ===', bookingData);
            const result = await createBooking(bookingData);
            console.log('=== Booking created successfully ===', result);
            
            // 모달 닫기
            setIsNewTeamModalOpen(false);
            setSelectedDate('');
            
            // 캐시 갱신을 위해 페이지 새로고침
            setTimeout(() => {
              window.location.reload();
            }, 500);
            
          } catch (error) {
            console.log('=== ERROR OCCURRED ===', error);
            alert('예약 생성에 실패했습니다. 다시 시도해 주세요.');
            
            // 오류 발생 시에도 모달 닫기
            setIsNewTeamModalOpen(false);
            setSelectedDate('');
          }
        }}
        selectedDate={selectedDate}
      />

      {/* TODO: Add TeamBookingDetailModal for viewing/editing existing bookings */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">예약 상세정보</h3>
            <div className="space-y-2">
              <p><strong>팀 코드:</strong> {selectedBooking.teamCode}</p>
              <p><strong>투어명:</strong> {selectedBooking.tourName}</p>
              <p><strong>목적지:</strong> {selectedBooking.destination}</p>
              <p><strong>출발일:</strong> {new Date(selectedBooking.departureDate).toLocaleDateString('ko-KR')}</p>
              <p><strong>귀국일:</strong> {new Date(selectedBooking.returnDate).toLocaleDateString('ko-KR')}</p>
              <p><strong>인원:</strong> {selectedBooking.totalCount}명</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}