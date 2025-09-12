'use client'

import { useState } from 'react'
import { CalendarMonth } from '@entrip/ui'
import type { BookingEntry } from '@entrip/shared'
import { BookingStatus } from '@entrip/shared'

// Temporary Button component for build issues
interface ButtonProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
  onClick?: () => void
}

const Button = ({ children, size, variant, onClick }: ButtonProps) => (
  <button
    className={`px-4 py-2 rounded ${
      variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'
    } ${size === 'sm' ? 'text-sm' : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
)

interface MockBooking extends BookingEntry {
  name: string
  typeCode: 'GF' | 'IN' | 'HM' | 'AT'
  time: string
  details: string
  manager: string
  // 추가된 속성들
  customerName: string
  destination: string
  departureDate: string
  numberOfPeople: number
}

const mockBookings: Record<string, MockBooking[]> = {
  '2025-06-15': [
    {
      id: '1',
      name: '김철수팀',
      date: '2025-06-15',
      type: 'golf',
      typeCode: 'GF',
      status: BookingStatus.CONFIRMED,
      paxCount: 4,
      time: '09:00',
      details: '발리 골프 투어',
      manager: '김담당',
      // Booking 인터페이스에 필요한 속성들 추가
      customerName: '김철수',
      destination: '발리',
      departureDate: '2025-06-15',
      numberOfPeople: 4,
    },
  ],
  '2025-06-18': [
    {
      id: '2',
      name: '이영희팀',
      date: '2025-06-18',
      type: 'incentive',
      typeCode: 'IN',
      status: BookingStatus.PENDING,
      paxCount: 20,
      time: '14:00',
      details: '태국 인센티브 투어',
      manager: '이담당',
      // Booking 인터페이스에 필요한 속성들 추가
      customerName: '이영희',
      destination: '태국',
      departureDate: '2025-06-18',
      numberOfPeople: 20,
    },
  ],
}

export default function BookingPageContent() {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">예약 관리</h1>
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('calendar')}
            >
              캘린더
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              리스트
            </Button>
          </div>
          <Button variant="primary">
            + 예약 등록
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarMonth
          month={new Date()}
          bookings={mockBookings as any}
          onAddBooking={(_date: Date) => {
            // TODO: Implement add booking functionality
          }}
          onBookingClick={(_booking: any) => {
            // TODO: Implement booking click handler
          }}
          onMonthChange={(_month: Date) => {
            // TODO: Implement month change handler
          }}
          className=""
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-gray-500">리스트 뷰 - 구현 예정</p>
          {/* TODO: DataGrid 컴포넌트 활용한 리스트 뷰 */}
        </div>
      )}
    </div>
  )
}