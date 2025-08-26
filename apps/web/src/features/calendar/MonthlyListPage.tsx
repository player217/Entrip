'use client';

import { useState, useMemo } from 'react';
import { MonthlyListView } from '@entrip/ui';
import { BookingEntry, BookingStatus } from '@entrip/shared';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useBookings } from '../../hooks/useBookings';
import BookingModal from '../../components/BookingModal';
import type { Booking } from '@entrip/shared';

// 실제 API 데이터를 BookingEntry 형식으로 변환
const convertToBookingEntry = (booking: any): BookingEntry => {
  // 간단한 타입 코드 매핑
  const getTypeCode = (destination: string): 'GF' | 'IN' | 'HM' | 'AT' => {
    if (destination.includes('일본') || destination.includes('태국') || destination.includes('베트남') || 
        destination.includes('싱가포르') || destination.includes('홍콩') || destination.includes('필리핀') || 
        destination.includes('대만')) return 'IN';
    if (destination.includes('신혼')) return 'HM';  
    if (destination.includes('골프') || destination.includes('Golf')) return 'GF';
    return 'AT';
  };

  // 매니저 이름 생성 (실제로는 user 테이블과 조인해야 하지만 임시로)
  const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
  const manager = managers[Math.floor(Math.random() * managers.length)];

  // 원가는 총가격의 70-85% 정도로 계산
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

export default function MonthlyListPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { bookings: apiBookings, isLoading, isError } = useBookings();
  
  // 실제 API 데이터를 월별로 필터링하고 변환
  const bookings = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return [];
    }
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return apiBookings
      .filter((booking: any) => {
        const bookingDate = new Date(booking.startDate);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      })
      .map(convertToBookingEntry);
  }, [apiBookings, currentMonth]);
  
  const handleBookingClick = (booking: BookingEntry) => {
    // Find the original booking from API data using the ID
    const originalBooking = apiBookings?.find((b: any) => b.id === booking.id);
    if (originalBooking) {
      setSelectedBooking(originalBooking);
      setIsModalOpen(true);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (isError) {
    return <div className="flex justify-center items-center h-64 text-red-500">데이터 로딩 오류</div>;
  }

  return (
    <>
      <MonthlyListView
        bookings={bookings}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        onBookingClick={handleBookingClick}
      />
      
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        onSave={() => {
          setIsModalOpen(false);
          setSelectedBooking(null);
        }}
      />
    </>
  );
}