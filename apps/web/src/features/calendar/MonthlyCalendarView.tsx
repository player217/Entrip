'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useModalStore } from '@entrip/shared/client';
import { BookingEvent, MonthlySummary, BookingStatus } from '@entrip/shared';
import { CalendarMonth, QuickBookingModal, EditBookingModal, MonthlySummaryFooter } from '@entrip/ui';
import type { QuickBookingFormData } from '@entrip/ui';
import { useBookings } from '../../hooks/useBookings';
import { useMainContentHeight } from '../../hooks/useViewportHeight';

// 실제 API 데이터를 BookingEvent 형식으로 변환
const convertToBookingEvent = (booking: any): BookingEvent => {
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
  const totalPrice = Number(booking.totalPrice) || Number(booking.price) || 0;
  const cost = Math.floor(totalPrice * (0.7 + Math.random() * 0.15));

  return {
    id: booking.id,
    typeCode: getTypeCode(booking.destination),
    name: booking.teamName || booking.customerName,  // 팀명 우선
    customerName: booking.customerName,               // 고객명 별도 저장
    destination: booking.destination,                 // 목적지 별도 저장
    teamName: booking.teamName,                       // 팀명
    status: booking.status === 'CANCELLED' ? BookingStatus.CANCELLED :
            booking.status === 'PENDING' ? BookingStatus.PENDING : 
            BookingStatus.CONFIRMED,
    manager,
    paxCount: booking.paxCount || booking.numberOfPeople || 0,
    date: format(new Date(booking.startDate || booking.departureDate || booking.date), 'yyyy-MM-dd'),
    departureDate: booking.startDate || booking.departureDate,  // 출발일
    returnDate: booking.endDate || booking.returnDate,           // 귀국일
    revenue: Number(booking.totalPrice) || Number(booking.price) || 0,
    totalPrice: Number(booking.totalPrice) || Number(booking.price) || 0,  // 총금액
    cost
  };
};

export function MonthlyCalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
  
  // 현재 월에 대한 month 파라미터 생성 (YYYY-MM 형식)
  const monthParam = format(currentMonth, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(monthParam);
  
  // 실제 API 데이터를 월별로 필터링하고 날짜별로 그룹화
  const bookings = useMemo(() => {
    const combinedBookings: Record<string, BookingEvent[]> = { ...bookingData };
    
    if (!apiBookings || apiBookings.length === 0) {
      return combinedBookings;
    }
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // API 데이터를 월별로 필터링하고 변환
    const monthlyBookings = apiBookings
      .filter((booking: any) => {
        const bookingDate = new Date(booking.startDate || booking.departureDate || booking.date);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      })
      .map(convertToBookingEvent);
    
    // 날짜별로 그룹화
    monthlyBookings.forEach(booking => {
      if (!combinedBookings[booking.date]) {
        combinedBookings[booking.date] = [];
      }
      combinedBookings[booking.date].push(booking);
    });
    
    return combinedBookings;
  }, [apiBookings, currentMonth, bookingData]);
  
  // 월간 합계 계산
  const monthlySummary = useMemo((): MonthlySummary => {
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
            <CalendarMonth
              month={currentMonth}
              bookings={bookings}
              onAddBooking={handleAddBooking}
              onBookingClick={handleBookingClick}
              onMonthChange={setCurrentMonth}
              className=""
              monthlySummary={monthlySummary}
            />
          </div>
        </div>
        
        {/* 월간 합계 푸터 - 하단 고정 */}
        <div className="flex-shrink-0 bg-white border-t">
          <MonthlySummaryFooter summary={monthlySummary} />
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

export default MonthlyCalendarView;
