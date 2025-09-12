'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CalendarWeek } from '@entrip/ui';
import { QuickBookingModal } from '@entrip/ui';
import { EditBookingModal } from '@entrip/ui';
import type { BookingEntry, BookingStatus } from '@entrip/shared';
import { addDays, startOfWeek, endOfWeek, format, eachDayOfInterval } from 'date-fns';
import { useBookings } from '../../../hooks/useBookings';

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
    title: booking.customerName + ' - ' + booking.destination,
    status: booking.status === 'confirmed' ? 'CONFIRMED' : 
            booking.status === 'pending' ? 'PENDING' : 
            'CANCELLED',
    manager,
    paxCount: booking.paxCount,
    date: booking.startDate,
    revenue: Number(booking.totalPrice),
    cost
  };
};

export default function CalendarWeekPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingEntry | null>(null);
  // 현재 주에 대한 month 파라미터 생성 (YYYY-MM 형식)
  const monthParam = format(currentWeek, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(monthParam);

  // 주간 날짜 범위 계산
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  // 실제 API 데이터를 주별로 필터링하고 변환
  const bookingsData = useMemo(() => {
    if (!apiBookings || apiBookings.length === 0) {
      return [];
    }

    return apiBookings
      .filter((booking: any) => {
        const bookingDate = new Date(booking.startDate);
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      })
      .map(convertToBookingEntry);
  }, [apiBookings, weekStart, weekEnd]);

  // 날짜별로 예약 그룹화
  const bookingsByDate = React.useMemo(() => {
    const grouped: Record<string, BookingEntry[]> = {};
    
    bookingsData.forEach((booking) => {
      const dateKey = booking.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    
    return grouped;
  }, [bookingsData]);

  // 예약 추가 핸들러
  const handleAddBooking = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsQuickModalOpen(true);
  }, []);

  // 예약 클릭 핸들러
  const handleBookingClick = useCallback((booking: BookingEntry) => {
    setSelectedBooking(booking);
    setIsEditModalOpen(true);
  }, []);

  // 주 변경 핸들러
  const handleWeekChange = useCallback((newWeek: Date) => {
    setCurrentWeek(newWeek);
  }, []);

  // 예약 생성 핸들러 (실제 API 호출)
  const handleQuickBookingSubmit = useCallback(async (data: any) => {
    console.log('=== QUICK BOOKING SUBMIT CALLED ===');
    console.log('=== QUICK BOOKING DATA ===', data);
    
    try {
      console.log('=== ABOUT TO CREATE BOOKING ===');
      
      // QuickBookingModal 데이터를 BookingAPI 형식으로 변환
      const bookingData = {
        teamCode: `QK${Date.now()}`, // 간단한 팀 코드 생성
        teamName: data.teamName || 'Quick Booking Team',
        tourName: data.teamName || 'Quick Tour',
        destination: data.destination || 'Unknown',
        departureDate: data.departureDate || new Date().toISOString().split('T')[0],
        returnDate: data.returnDate || new Date().toISOString().split('T')[0],
        startDate: data.departureDate || new Date().toISOString().split('T')[0],
        endDate: data.returnDate || new Date().toISOString().split('T')[0],
        customerName: data.representative || 'Quick Customer',
        phone: data.contact || '',
        totalCount: data.pax || 1,
        adultCount: data.pax || 1,
        childCount: 0,
        infantCount: 0,
        nights: 1,
        days: 2,
        totalPrice: 100000, // 기본 가격
        status: 'confirmed',
        paxCount: data.pax || 1,
        currency: 'KRW'
      };
      
      console.log('=== Calling createBooking with data ===', bookingData);
      
      // createBooking 함수를 import해서 사용해야 함
      const { createBooking } = await import('../../../hooks/useBookings');
      const result = await createBooking(bookingData);
      
      console.log('=== Booking created successfully ===', result);
      alert('예약이 성공적으로 생성되었습니다!');
      
      // 성공 시 모달 닫기
      setIsQuickModalOpen(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('=== ERROR OCCURRED IN QUICK BOOKING ===', error);
      alert('예약 생성에 실패했습니다. 다시 시도해 주세요.');
    }
  }, []);

  // 예약 수정 핸들러 (개발 모드용 mock)
  const handleEditBookingSubmit = useCallback(async (data: any) => {
    if (!selectedBooking) return;

    try {
      // 개발 모드에서는 간단한 알림만 표시
      alert('개발 모드: 예약이 수정되었습니다!');
      
      // 성공 시 모달 닫기
      setIsEditModalOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('예약 수정 중 오류:', error);
      alert('예약 수정에 실패했습니다.');
    }
  }, [selectedBooking]);

  // 예약 삭제 핸들러 (개발 모드용 mock)
  const handleDeleteBooking = useCallback(async () => {
    if (!selectedBooking) return;

    if (!confirm('정말로 이 예약을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 개발 모드에서는 간단한 알림만 표시
      alert('개발 모드: 예약이 삭제되었습니다!');
      
      // 성공 시 모달 닫기
      setIsEditModalOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('예약 삭제 중 오류:', error);
      alert('예약 삭제에 실패했습니다.');
    }
  }, [selectedBooking]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (isError) {
    return <div className="flex justify-center items-center h-64 text-red-500">데이터 로딩 오류</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 캘린더 컴포넌트 - 헤더는 CalendarWeek 내부에 포함 */}
      <CalendarWeek
        week={currentWeek}
        bookings={bookingsByDate}
        onAddBooking={handleAddBooking}
        onBookingClick={handleBookingClick}
        onWeekChange={handleWeekChange}
        className="h-full"
      />

      {/* 예약 추가 모달 */}
      {isQuickModalOpen && (
        <QuickBookingModal
          isOpen={isQuickModalOpen}
          onClose={() => {
            setIsQuickModalOpen(false);
            setSelectedDate(null);
          }}
          onSubmit={handleQuickBookingSubmit}
          selectedDate={selectedDate || undefined}
        />
      )}

      {/* 예약 수정 모달 */}
      {isEditModalOpen && selectedBooking && (
        <EditBookingModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedBooking(null);
          }}
          onSubmit={handleEditBookingSubmit}
          onDelete={handleDeleteBooking}
          booking={selectedBooking}
        />
      )}
    </div>
  );
}