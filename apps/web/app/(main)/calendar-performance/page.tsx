'use client';

import { useState } from 'react';
import CalendarProfiler from '@/components/CalendarProfiler';
import { addDays, format } from 'date-fns';
import { logger, BookingType, BookingStatus } from '@entrip/shared';

// Generate test bookings
function generateTestBookings(count: number) {
  const bookings = [];
  const today = new Date();
  
  for (let i = 0; i < count; i++) {
    const departureDate = addDays(today, Math.floor(Math.random() * 30));
    const endDate = addDays(departureDate, Math.floor(Math.random() * 7) + 1);
    
    // 확실한 타입으로 강제 단언
    const bookingTypes = [BookingType.PACKAGE, BookingType.FIT, BookingType.GROUP, BookingType.BUSINESS] as const;
    const destinations = ['파리', '런던', '도쿄', '뉴욕', '시드니'] as const;
    const statuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED] as const;
    const selectedBookingType = bookingTypes[i % bookingTypes.length]!;
    const selectedDestination = destinations[i % destinations.length]!;
    const selectedStatus = statuses[Math.floor(Math.random() * statuses.length)]!;
    
    bookings.push({
      id: `booking-${i}`,
      bookingNumber: `BK${String(i + 1).padStart(4, '0')}`,
      customerName: `고객 ${i + 1}`,
      teamName: `팀 ${Math.floor(i / 10) + 1}`,
      bookingType: selectedBookingType,
      destination: selectedDestination,
      startDate: format(departureDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      paxCount: Math.floor(Math.random() * 10) + 1,
      nights: Math.floor((endDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)),
      days: Math.floor((endDate.getTime() - departureDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      status: selectedStatus,
      totalPrice: (Math.floor(Math.random() * 500) + 100) * 10000,
      currency: 'KRW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: `user-${Math.floor(Math.random() * 5) + 1}`,
      // Mapped fields for frontend compatibility
      client: `고객 ${i + 1}`,
      price: (Math.floor(Math.random() * 500) + 100) * 10000,
    });
  }
  
  return bookings;
}

export default function CalendarPerformancePage() {
  const [currentDate] = useState(new Date());
  const [bookingCount, setBookingCount] = useState(100);
  const [bookings, setBookings] = useState(() => generateTestBookings(100));

  const handleBookingCountChange = (count: number) => {
    setBookingCount(count);
    setBookings(generateTestBookings(count));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">캘린더 성능 테스트</h1>
      
      {/* Test controls */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="font-medium mb-3">테스트 설정</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm">예약 개수:</label>
          <select
            value={bookingCount}
            onChange={(e) => handleBookingCountChange(Number(e.target.value))}
            className="border rounded px-3 py-1"
          >
            <option value="50">50개</option>
            <option value="100">100개</option>
            <option value="200">200개</option>
            <option value="500">500개</option>
            <option value="1000">1000개</option>
          </select>
          <span className="text-sm text-gray-600">
            현재 {bookings.length}개의 예약 데이터
          </span>
        </div>
      </div>

      {/* Calendar with profiler */}
      <CalendarProfiler
        currentDate={currentDate}
        bookings={bookings}
        onDayClick={(date) => logger.info('Day clicked:', date.toISOString())}
        onBookingClick={(booking) => logger.info('Booking clicked:', JSON.stringify(booking))}
      />
    </div>
  );
}