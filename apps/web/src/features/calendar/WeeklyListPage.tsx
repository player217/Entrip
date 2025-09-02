'use client';

import { useState, useMemo } from 'react';
import { WeeklyListView } from '@entrip/ui';
import { BookingEntry, BookingStatus } from '@entrip/shared';
import { useBookings } from '../../hooks/useBookings';
import { format } from 'date-fns';

// API 데이터를 BookingEntry로 변환 (MonthlyListPage 스타일)
const convertToBookingEntry = (booking: any): BookingEntry => {
  const getTypeCode = (destination: string): 'GF' | 'IN' | 'HM' | 'AT' => {
    if (destination.includes('일본') || destination.includes('태국') || destination.includes('베트남') || 
        destination.includes('싱가포르') || destination.includes('홍콩') || destination.includes('필리핀') || 
        destination.includes('대만')) return 'IN';
    if (destination.includes('신혼')) return 'HM';  
    if (destination.includes('골프') || destination.includes('Golf')) return 'GF';
    return 'AT';
  };

  const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
  const manager = managers[Math.floor(Math.random() * managers.length)];
  const cost = Math.floor(Number(booking.totalPrice) * (0.7 + Math.random() * 0.15));

  return {
    id: booking.id,
    typeCode: getTypeCode(booking.destination),
    name: booking.customerName + ' - ' + booking.destination,
    status: booking.status === 'confirmed' ? BookingStatus.CONFIRMED : 
            booking.status === 'pending' ? BookingStatus.PENDING : 
            BookingStatus.CANCELLED,
    manager,
    paxCount: booking.paxCount,
    date: booking.startDate,
    revenue: Number(booking.totalPrice),
    cost
  };
};

export default function WeeklyListPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  const weekParam = format(currentWeek, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(weekParam);

  // API 데이터를 평면 배열로 변환 (WeeklyListView가 필요한 형식)
  const bookings = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return [];
    }
    return apiBookings.map(convertToBookingEntry);
  }, [apiBookings]);

  const handleBookingClick = (booking: BookingEntry) => {
    // 필요시 상세 모달 구현
    console.log('Booking clicked:', booking);
  };

  const handleWeekChange = (week: Date) => {
    setCurrentWeek(week);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (isError) {
    return <div className="flex justify-center items-center h-64 text-red-500">데이터 로딩 오류</div>;
  }

  return (
    <div className="h-full w-full">
      <WeeklyListView
        bookings={bookings}
        week={currentWeek}
        onWeekChange={handleWeekChange}
        onBookingClick={handleBookingClick}
        className="h-full"
      />
    </div>
  );
}