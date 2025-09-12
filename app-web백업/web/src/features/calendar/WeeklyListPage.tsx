'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useModalStore } from '@entrip/shared/client';
import { BookingEvent, BookingStatus, MonthlySummary } from '@entrip/shared';
import { CalendarWeek, QuickBookingModal, EditBookingModal, WeeklySummaryFooter } from '@entrip/ui';
import type { QuickBookingFormData } from '@entrip/ui';
import { useBookings } from '../../hooks/useBookings';
import { useMainContentHeight } from '../../hooks/useViewportHeight';

// 실제 API 데이터를 BookingEvent 형식으로 변환 (MonthlyCalendarView와 동일)
const convertToBookingEvent = (booking: any): BookingEvent => {
  // 디버깅용 로그 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log('[WeeklyListPage] Raw booking data:', booking);
  }

  // 타입 코드 매핑
  const getTypeCode = (destination: string): 'GF' | 'IN' | 'HM' | 'AT' => {
    if (!destination) return 'AT';
    
    if (destination.includes('일본') || destination.includes('태국') || destination.includes('베트남') || 
        destination.includes('싱가포르') || destination.includes('홍콩') || destination.includes('필리핀') || 
        destination.includes('대만')) return 'IN';
    if (destination.includes('신혼')) return 'HM';  
    if (destination.includes('골프') || destination.includes('Golf')) return 'GF';
    return 'AT';
  };

  // 매니저 이름 생성
  const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
  const manager = managers[Math.floor(Math.random() * managers.length)];

  // 필드 안전하게 추출 (API 응답 형식에 맞게)
  const customerName = booking.customerName || booking.client || '미정';
  const destination = booking.destination || '미정';
  const teamName = booking.teamName || customerName;
  const totalPrice = Number(booking.totalPrice || booking.price || 0);
  const paxCount = Number(booking.paxCount || booking.numberOfPeople || 0);
  
  // 날짜 처리 (안전하게)
  let dateStr = 'invalid-date';
  try {
    const dateObj = new Date(booking.startDate || booking.departureDate || booking.date);
    if (!isNaN(dateObj.getTime())) {
      dateStr = format(dateObj, 'yyyy-MM-dd');
    }
  } catch (e) {
    console.error('[WeeklyListPage] Date parsing error:', e, booking);
  }

  // 원가 계산
  const cost = Math.floor(totalPrice * (0.7 + Math.random() * 0.15));

  // 상태 매핑 (대소문자 처리)
  const getStatus = (status: string): BookingStatus => {
    const upperStatus = (status || '').toUpperCase();
    switch (upperStatus) {
      case 'CANCELLED': return BookingStatus.CANCELLED;
      case 'PENDING': return BookingStatus.PENDING;
      case 'CONFIRMED': return BookingStatus.CONFIRMED;
      default: return BookingStatus.PENDING;
    }
  };

  const result = {
    id: booking.id || `temp-${Date.now()}`,
    typeCode: getTypeCode(destination),
    name: teamName,
    customerName: customerName,
    destination: destination,
    teamName: teamName,
    status: getStatus(booking.status),
    manager,
    paxCount,
    date: dateStr,
    departureDate: booking.startDate || booking.departureDate,
    returnDate: booking.endDate || booking.returnDate,
    revenue: totalPrice,
    totalPrice: totalPrice,
    cost
  };

  // 디버깅용 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('[WeeklyListPage] Converted booking:', result);
  }

  return result;
};

export default function WeeklyListPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { cssHeight } = useMainContentHeight(50); // 푸터 높이 50px 고려
  const { 
    isQuickAddModalOpen, 
    selectedDate, 
    openQuickAddModal, 
    closeQuickAddModal,
    isEditModalOpen,
    selectedBooking,
    openEditModal,
    closeEditModal 
  } = useModalStore();
  const [bookingData, setBookingData] = useState<Record<string, BookingEvent[]>>({});
  
  // 현재 주에 대한 주간 파라미터 생성
  const weekParam = format(currentWeek, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(weekParam);
  
  // 실제 API 데이터를 주간 단위로 필터링하고 날짜별로 그룹화
  const bookings = useMemo(() => {
    const combinedBookings: Record<string, BookingEvent[]> = {};
    
    // 수동으로 추가한 데이터 먼저 추가
    Object.entries(bookingData).forEach(([date, events]) => {
      combinedBookings[date] = [...events];
    });
    
    if (!apiBookings || apiBookings.length === 0) {
      console.log('[WeeklyListPage] No API bookings available');
      return combinedBookings;
    }
    
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
    
    console.log('[WeeklyListPage] Week range:', {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd'),
      totalBookings: apiBookings.length
    });
    
    // API 데이터를 주간별로 필터링하고 변환
    const weeklyBookings = apiBookings
      .filter((booking: any) => {
        try {
          const bookingDate = new Date(booking.startDate || booking.departureDate || booking.date);
          const isInRange = bookingDate >= weekStart && bookingDate <= weekEnd;
          
          if (isInRange && process.env.NODE_ENV === 'development') {
            console.log('[WeeklyListPage] Booking in range:', {
              id: booking.id,
              date: format(bookingDate, 'yyyy-MM-dd'),
              customerName: booking.customerName
            });
          }
          
          return isInRange;
        } catch (e) {
          console.error('[WeeklyListPage] Date filter error:', e, booking);
          return false;
        }
      })
      .map(convertToBookingEvent);
    
    console.log('[WeeklyListPage] Filtered bookings count:', weeklyBookings.length);
    
    // 날짜별로 그룹화 (중복 체크 포함)
    weeklyBookings.forEach(booking => {
      const dateKey = booking.date;
      
      // 유효한 날짜인지 확인
      if (dateKey === 'invalid-date') {
        console.warn('[WeeklyListPage] Invalid date for booking:', booking);
        return;
      }
      
      if (!combinedBookings[dateKey]) {
        combinedBookings[dateKey] = [];
      }
      
      // 중복 체크 (ID 기준)
      const exists = combinedBookings[dateKey].some(b => b.id === booking.id);
      if (!exists) {
        combinedBookings[dateKey].push(booking);
      } else {
        console.log('[WeeklyListPage] Duplicate booking skipped:', booking.id);
      }
    });
    
    // 최종 그룹화 결과 로그
    console.log('[WeeklyListPage] Final grouped bookings:', {
      dates: Object.keys(combinedBookings),
      counts: Object.entries(combinedBookings).map(([date, items]) => ({
        date,
        count: items.length
      }))
    });
    
    return combinedBookings;
  }, [apiBookings, currentWeek, bookingData]);
  
  // 주간 합계 계산
  const weeklySummary = useMemo((): MonthlySummary => {
    let teamCount = 0;
    let paxCount = 0;
    let revenue = 0;
    let cost = 0;
    
    Object.values(bookings).forEach(dayBookings => {
      dayBookings.forEach(booking => {
        if (booking.status !== BookingStatus.CANCELLED) {
          teamCount++;
          paxCount += booking.paxCount || 0;
          revenue += booking.revenue || 0;
          cost += booking.cost || 0;
        }
      });
    });
    
    return {
      teamCount,
      paxCount,
      revenue,
      profit: revenue - cost
    };
  }, [bookings]);

  const handleAddBooking = (date: Date) => {
    openQuickAddModal(date);
  };
  
  const handleQuickAddSubmit = async (data: QuickBookingFormData) => {
    // 새 예약 데이터 추가
    const newBooking: BookingEvent = {
      id: `booking-${Date.now()}`,
      typeCode: data.teamType as 'GF' | 'IN' | 'HM' | 'AT' | undefined,
      name: data.teamName,
      status: BookingStatus.PENDING,
      manager: '김민수', // 임시 담당자
      paxCount: data.pax,
      date: data.departureDate,
      revenue: data.pax * 500000, // 임시 계산
      cost: data.pax * 350000 // 임시 계산
    };
    
    setBookingData(prev => ({
      ...prev,
      [data.departureDate]: [...(prev[data.departureDate] || []), newBooking]
    }));
    
    closeQuickAddModal();
    alert('예약이 추가되었습니다!');
  };

  const handleBookingClick = (booking: BookingEvent) => {
    openEditModal(booking);
  };
  
  const handleEditSubmit = async (data: QuickBookingFormData) => {
    
    // 기존 예약 업데이트
    if (selectedBooking) {
      const updatedBooking: BookingEvent = {
        ...selectedBooking,
        typeCode: data.teamType as 'GF' | 'IN' | 'HM' | 'AT' | undefined,
        name: data.teamName,
        paxCount: data.pax,
        date: data.departureDate,
        revenue: data.pax * 500000, // 임시 계산
        cost: data.pax * 350000 // 임시 계산
      };
      
      setBookingData(prev => {
        const newData = { ...prev };
        // 기존 날짜에서 예약 제거
        if (newData[selectedBooking.date]) {
          newData[selectedBooking.date] = newData[selectedBooking.date]!.filter(b => b.id !== selectedBooking.id);
        }
        // 새 날짜에 예약 추가
        if (!newData[data.departureDate]) {
          newData[data.departureDate] = [];
        }
        newData[data.departureDate]!.push(updatedBooking);
        return newData;
      });
      
      closeEditModal();
      alert('예약이 수정되었습니다!');
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
      <div 
        className="flex flex-col h-full overflow-hidden"
        style={{ height: cssHeight, maxHeight: cssHeight, minHeight: cssHeight }}
      >
        {/* 캘린더 본체 - 스크롤 가능 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="pb-4">
            <CalendarWeek
              week={currentWeek}
              bookings={bookings}
              onAddBooking={handleAddBooking}
              onBookingClick={handleBookingClick}
              onWeekChange={setCurrentWeek}
              weeklySummary={weeklySummary}
            />
          </div>
        </div>
        
        {/* 주간 합계 푸터 - 하단 고정 */}
        <div className="flex-shrink-0 bg-white border-t">
          <WeeklySummaryFooter summary={weeklySummary} />
        </div>
      </div>
      
      {/* 빠른 예약 추가 모달 */}
      <QuickBookingModal
        isOpen={isQuickAddModalOpen}
        onClose={closeQuickAddModal}
        onSubmit={handleQuickAddSubmit}
        selectedDate={selectedDate || undefined}
      />
      
      {/* 예약 수정 모달 */}
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        booking={selectedBooking}
      />
    </>
  );
}