'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useModalStore } from '@entrip/shared/client';
import { Booking, BookingEvent, MonthlySummary, BookingStatus } from '@entrip/shared';
import { CalendarMonth, QuickBookingModal, EditBookingModal, MonthlySummaryFooter } from '@entrip/ui';
import type { QuickBookingFormData } from '@entrip/ui';
import { useBookings } from '../../hooks/useBookings';
import { useMainContentHeight } from '../../hooks/useViewportHeight';
import { ensureValidDate } from '../../utils/dateValidation';

// 실제 API 데이터를 BookingEvent 형식으로 변환
const convertToBookingEvent = (booking: Booking): BookingEvent => {
  // 간단한 타입 코드 매핑
  const getTypeCode = (destination: string): 'GF' | 'IN' | 'HM' | 'AT' => {
    if (destination.includes('일본') || destination.includes('태국') || destination.includes('베트남') || 
        destination.includes('싱가포르') || destination.includes('홍콩') || destination.includes('필리핀') || 
        destination.includes('대만')) return 'IN';
    if (destination.includes('신혼')) return 'HM';  
    if (destination.includes('골프') || destination.includes('Golf')) return 'GF';
    return 'AT';
  };

  // 실제 매니저 정보 사용 (managerName 필드 우선, 없으면 기본값)
  const manager = booking.managerName || '담당자 미지정';

  // 실제 원가 데이터 사용 (costPrice 필드 우선, 없으면 계산)
  const totalPrice = Number(booking.totalPrice) || 0;
  const cost = booking.costPrice ? Number(booking.costPrice) : Math.floor(totalPrice * 0.75); // 기본 75% 마진

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
    date: format(new Date(booking.startDate || booking.departureDate || booking.date || new Date()), 'yyyy-MM-dd'),
    departureDate: booking.startDate || booking.departureDate,  // 출발일
    returnDate: booking.endDate || booking.returnDate,           // 귀국일
    revenue: Number(booking.totalPrice) || Number(booking.price) || 0,
    totalPrice: Number(booking.totalPrice) || Number(booking.price) || 0,  // 총금액
    cost
  };
};

interface MonthlyCalendarViewProps {
  currentMonth?: Date;
  bookings?: Record<string, BookingEvent[]>;
  onAddBooking?: (date: Date) => void;
  onBookingClick?: (booking: BookingEvent) => void;
  onMonthChange?: (month: Date) => void;
  monthlySummary?: MonthlySummary;
}

export function MonthlyCalendarView(props: MonthlyCalendarViewProps = {}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => ensureValidDate(props.currentMonth || new Date()));
  const { cssHeight } = useMainContentHeight(40); // 푸터 높이 40px 고려 (h-10)
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
  const validMonth = ensureValidDate(currentMonth);
  const monthParam = format(validMonth, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(monthParam);
  
  // 실제 API 데이터를 월별로 필터링하고 날짜별로 그룹화
  const bookings = useMemo(() => {
    // props.bookings가 제공되면 우선 사용
    if (props.bookings) {
      return props.bookings;
    }
    
    const combinedBookings: Record<string, BookingEvent[]> = { ...bookingData };
    
    if (!apiBookings || apiBookings.length === 0) {
      return combinedBookings;
    }
    
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // API 데이터를 월별로 필터링하고 변환
    const monthlyBookings = apiBookings
      .filter((booking: Booking) => {
        const bookingDate = new Date(booking.startDate || booking.endDate || new Date());
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      })
      .map(convertToBookingEvent);
    
    // 날짜별로 그룹화
    monthlyBookings.forEach((booking: BookingEvent) => {
      if (!combinedBookings[booking.date]) {
        combinedBookings[booking.date] = [];
      }
      combinedBookings[booking.date]!.push(booking);
    });
    
    return combinedBookings;
  }, [apiBookings, currentMonth, bookingData, props.bookings]);
  
  // 월간 합계 계산 (props에서 제공되면 사용)
  const monthlySummary = useMemo((): MonthlySummary => {
    if (props.monthlySummary) {
      return props.monthlySummary;
    }
    
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
  }, [bookings, props.monthlySummary]);

  const handleAddBooking = (date: Date) => {
    if (props.onAddBooking) {
      props.onAddBooking(date);
    } else {
      openQuickAddModal(date);
    }
  };
  
  const handleQuickAddSubmit = async (data: QuickBookingFormData) => {
    // 새 예약 데이터 추가
    const newBooking: BookingEvent = {
      id: `booking-${Date.now()}`,
      typeCode: data.teamType as 'GF' | 'IN' | 'HM' | 'AT' | undefined,
      name: data.teamName,
      status: BookingStatus.PENDING,
      manager: data.managerName || '담당자 미지정',
      paxCount: data.pax,
      date: data.departureDate,
      revenue: data.totalPrice || (data.pax * 500000), // 실제 가격 우선, 없으면 추정
      cost: data.costPrice || (data.totalPrice ? Math.floor(data.totalPrice * 0.75) : data.pax * 350000)
    };
    
    setBookingData(prev => ({
      ...prev,
      [data.departureDate]: [...(prev[data.departureDate] || []), newBooking]
    }));
    
    closeQuickAddModal();
    alert('예약이 추가되었습니다!');
  };

  const handleBookingClick = (booking: BookingEvent) => {
    if (props.onBookingClick) {
      props.onBookingClick(booking);
    } else {
      openEditModal(booking);
    }
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
        revenue: data.totalPrice || (data.pax * 500000), // 실제 가격 우선, 없으면 추정
        cost: data.costPrice || (data.totalPrice ? Math.floor(data.totalPrice * 0.75) : data.pax * 350000)
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
      <div className="h-full flex flex-col">
        {/* 캘린더 본체 */}
        <div className="flex-1 min-h-0 overflow-auto">
          <CalendarMonth
            month={currentMonth}
            bookings={bookings}
            onAddBooking={handleAddBooking}
            onBookingClick={handleBookingClick}
            onMonthChange={(newMonth: Date) => {
              const validMonth = ensureValidDate(newMonth);
              setCurrentMonth(validMonth);
              if (props.onMonthChange) {
                props.onMonthChange(validMonth);
              }
            }}
            className=""
            monthlySummary={monthlySummary}
          />
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