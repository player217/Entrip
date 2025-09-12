'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useModalStore } from '@entrip/shared/client';
import { Booking, BookingEvent, BookingStatus, MonthlySummary } from '@entrip/shared';
import { QuickBookingModal, EditBookingModal, MonthlySummaryFooter } from '@entrip/ui';
import type { QuickBookingFormData } from '@entrip/ui';
import MonthlyListPage from '@/features/calendar/MonthlyListPage';
import { useBookings } from '@/hooks/useBookings';
import { useMainContentHeight } from '@/hooks/useViewportHeight';
import { getBookingDate, priceOf, getPaxCount, getCustomerName } from '@/utils/booking-helpers';

// API 데이터를 BookingEvent 형식으로 변환
const convertToBookingEvent = (booking: Booking): BookingEvent => {
  console.log('[ListMonthlyPage] Raw booking data:', booking);

  const getTypeCode = (destination: string): 'GF' | 'IN' | 'HM' | 'AT' => {
    if (!destination) return 'AT';
    
    if (destination.includes('일본') || destination.includes('태국') || destination.includes('베트남') || 
        destination.includes('싱가포르') || destination.includes('홍콩') || destination.includes('필리핀') || 
        destination.includes('대만')) return 'IN';
    if (destination.includes('신혼')) return 'HM';  
    if (destination.includes('골프') || destination.includes('Golf')) return 'GF';
    return 'AT';
  };

  const managers = ['김민수', '이지영', '박준혁', '최서연', '정태호'];
  const manager = managers[Math.floor(Math.random() * managers.length)];

  const customerName = getCustomerName(booking);
  const destination = booking.destination || '미정';
  const teamName = booking.teamName || customerName;
  const totalPrice = priceOf(booking);
  const paxCount = getPaxCount(booking);
  
  let dateStr = 'invalid-date';
  const dateObj = getBookingDate(booking);
  if (dateObj) {
    try {
      dateStr = format(dateObj, 'yyyy-MM-dd');
    } catch (e) {
      console.error('[ListMonthlyPage] Date formatting error:', e, booking);
    }
  }

  const cost = Math.floor(totalPrice * (0.7 + Math.random() * 0.15));

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
    departureDate: booking.startDate,
    returnDate: booking.endDate,
    revenue: totalPrice,
    totalPrice: totalPrice,
    cost
  };

  console.log('[ListMonthlyPage] Converted booking:', result);
  return result;
};

export default function ListMonthlyPageComponent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { cssHeight } = useMainContentHeight(50);
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
  const [bookingData, setBookingData] = useState<BookingEvent[]>([]);
  
  const monthParam = format(currentMonth, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError } = useBookings(monthParam);
  
  const bookings = useMemo(() => {
    console.log('[ListMonthlyPage] Computing bookings, apiBookings:', apiBookings?.length || 0);
    console.log('[ListMonthlyPage] Current month:', format(currentMonth, 'yyyy-MM'));
    
    let combinedBookings: BookingEvent[] = [...bookingData];
    
    if (!apiBookings || apiBookings.length === 0) {
      console.log('[ListMonthlyPage] No API bookings available');
      return combinedBookings;
    }
    
    const monthlyBookings = apiBookings
      .filter((booking: Booking) => {
        try {
          const bookingDate = getBookingDate(booking);
          if (!bookingDate) return false;
          
          const bookingMonth = format(bookingDate, 'yyyy-MM');
          const currentMonthStr = format(currentMonth, 'yyyy-MM');
          const isInMonth = bookingMonth === currentMonthStr;
          
          if (isInMonth) {
            console.log('[ListMonthlyPage] Booking in month:', {
              id: booking.id,
              date: format(bookingDate, 'yyyy-MM-dd'),
              customerName: booking.customerName
            });
          }
          
          return isInMonth;
        } catch (e) {
          console.error('[ListMonthlyPage] Date filter error:', e, booking);
          return false;
        }
      })
      .map(convertToBookingEvent);
    
    console.log('[ListMonthlyPage] Filtered bookings count:', monthlyBookings.length);
    
    // 중복 제거하고 결합
    monthlyBookings.forEach((booking: BookingEvent) => {
      const exists = combinedBookings.some(b => b.id === booking.id);
      if (!exists) {
        combinedBookings.push(booking);
      } else {
        console.log('[ListMonthlyPage] Duplicate booking skipped:', booking.id);
      }
    });
    
    console.log('[ListMonthlyPage] Final bookings count:', combinedBookings.length);
    
    return combinedBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [apiBookings, currentMonth, bookingData]);
  
  const monthlySummary = useMemo((): MonthlySummary => {
    let teamCount = 0;
    let paxCount = 0;
    let revenue = 0;
    let cost = 0;
    
    bookings.forEach(booking => {
      if (booking.status !== BookingStatus.CANCELLED) {
        teamCount++;
        paxCount += booking.paxCount || 0;
        revenue += booking.revenue || 0;
        cost += booking.cost || 0;
      }
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
    const newBooking: BookingEvent = {
      id: `booking-${Date.now()}`,
      typeCode: data.teamType as 'GF' | 'IN' | 'HM' | 'AT' | undefined,
      name: data.teamName,
      status: BookingStatus.PENDING,
      manager: '김민수',
      paxCount: data.pax,
      date: data.departureDate,
      revenue: data.pax * 500000,
      cost: data.pax * 350000
    };
    
    setBookingData(prev => [...prev, newBooking]);
    
    closeQuickAddModal();
    alert('예약이 추가되었습니다!');
  };

  const handleBookingClick = (booking: BookingEvent) => {
    openEditModal(booking);
  };
  
  const handleEditSubmit = async (data: QuickBookingFormData) => {
    if (selectedBooking) {
      const updatedBooking: BookingEvent = {
        ...selectedBooking,
        typeCode: data.teamType as 'GF' | 'IN' | 'HM' | 'AT' | undefined,
        name: data.teamName,
        paxCount: data.pax,
        date: data.departureDate,
        revenue: data.pax * 500000,
        cost: data.pax * 350000
      };
      
      setBookingData(prev => 
        prev.map(b => b.id === selectedBooking.id ? updatedBooking : b)
      );
      
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="pb-4">
            <MonthlyListPage />
          </div>
        </div>
        
        <div className="flex-shrink-0 bg-white border-t">
          <MonthlySummaryFooter summary={monthlySummary} />
        </div>
      </div>
      
      <QuickBookingModal
        isOpen={isQuickAddModalOpen}
        onClose={closeQuickAddModal}
        onSubmit={handleQuickAddSubmit}
        selectedDate={selectedDate || undefined}
      />
      
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        booking={selectedBooking}
      />
    </>
  );
}