'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useModalStore } from '@entrip/shared/client';
import { Booking, BookingEvent, BookingStatus, MonthlySummary } from '@entrip/shared';
import { QuickBookingModal, EditBookingModal, MonthlySummaryFooter } from '@entrip/ui';
import type { QuickBookingFormData } from '@entrip/ui';
import MonthlyCalendarView from '@/features/calendar/MonthlyCalendarView';
import { useBookings } from '@/hooks/useBookings';
import { useMainContentHeight } from '@/hooks/useViewportHeight';
import { getBookingDate, priceOf, getPaxCount, getCustomerName } from '@/utils/booking-helpers';
import { useAuthStore } from '@/lib/auth-store';

// API 데이터를 BookingEvent 형식으로 변환
const convertToBookingEvent = (booking: Booking): BookingEvent => {
  console.log('[CalendarMonthlyPage] Raw booking data:', booking);

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
      console.error('[CalendarMonthlyPage] Date formatting error:', e, booking);
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

  console.log('[CalendarMonthlyPage] Converted booking:', result);
  return result;
};

export default function CalendarMonthlyPage() {
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
  const [bookingData, setBookingData] = useState<Record<string, BookingEvent[]>>({});
  
  const monthParam = format(currentMonth, 'yyyy-MM');
  const { bookings: apiBookings, isLoading, isError, mutate } = useBookings(monthParam);
  const { user } = useAuthStore();
  
  const bookings = useMemo(() => {
    console.log('[CalendarMonthlyPage] Computing bookings, apiBookings:', apiBookings?.length || 0);
    console.log('[CalendarMonthlyPage] Current month:', format(currentMonth, 'yyyy-MM'));
    
    const combinedBookings: Record<string, BookingEvent[]> = {};
    
    Object.entries(bookingData).forEach(([date, events]) => {
      combinedBookings[date] = [...events];
    });
    
    if (!apiBookings || apiBookings.length === 0) {
      console.log('[CalendarMonthlyPage] No API bookings available');
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
            console.log('[CalendarMonthlyPage] Booking in month:', {
              id: booking.id,
              date: format(bookingDate, 'yyyy-MM-dd'),
              customerName: booking.customerName
            });
          }
          
          return isInMonth;
        } catch (e) {
          console.error('[CalendarMonthlyPage] Date filter error:', e, booking);
          return false;
        }
      })
      .map(convertToBookingEvent);
    
    console.log('[CalendarMonthlyPage] Filtered bookings count:', monthlyBookings.length);
    
    monthlyBookings.forEach((booking: BookingEvent) => {
      const dateKey = booking.date;
      
      if (dateKey === 'invalid-date') {
        console.warn('[CalendarMonthlyPage] Invalid date for booking:', booking);
        return;
      }
      
      if (!combinedBookings[dateKey]) {
        combinedBookings[dateKey] = [];
      }
      
      const exists = combinedBookings[dateKey].some(b => b.id === booking.id);
      if (!exists) {
        combinedBookings[dateKey].push(booking);
      } else {
        console.log('[CalendarMonthlyPage] Duplicate booking skipped:', booking.id);
      }
    });
    
    console.log('[CalendarMonthlyPage] Final grouped bookings:', {
      dates: Object.keys(combinedBookings),
      counts: Object.entries(combinedBookings).map(([date, items]) => ({
        date,
        count: items.length
      }))
    });
    
    return combinedBookings;
  }, [apiBookings, currentMonth, bookingData]);
  
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
    try {
      // Create booking in database
      const { createBooking } = await import('@/hooks/useBookings');
      const createdBooking = await createBooking({
        teamName: data.teamName,
        customerName: data.customerName || data.teamName,
        bookingType: 'TEAM_PACKAGE',
        status: 'PENDING',
        startDate: data.departureDate,
        endDate: data.departureDate,
        destination: data.destination || '미정',
        teamSize: data.pax,
        estimatedTotalCost: data.pax * 500000,
        managerName: '김민수',
        managerEmail: `manager@${user?.companyCode?.toLowerCase() || 'entrip'}.com`,
        managerPhone: '010-1234-5678',
        transportation: '버스',
        accommodation: '호텔',
        purpose: '워크샵',
        paymentMethod: '계좌이체',
        paymentStatus: 'PENDING'
      });

      if (createdBooking) {
        // Refresh the booking data to show the new booking
        await mutate();
        closeQuickAddModal();
        alert('예약이 데이터베이스에 저장되었습니다!');
      }
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('예약 추가에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleBookingClick = (booking: BookingEvent) => {
    openEditModal(booking);
  };
  
  const handleEditSubmit = async (data: QuickBookingFormData) => {
    if (selectedBooking) {
      try {
        // Update booking in database
        const { updateBooking } = await import('@/hooks/useBookings');
        await updateBooking(selectedBooking.id, {
          teamName: data.teamName,
          customerName: data.customerName || data.teamName,
          startDate: new Date(data.departureDate),
          endDate: new Date(data.departureDate),
          destination: data.destination || '미정',
          teamSize: data.pax,
          estimatedTotalCost: data.pax * 500000
        });

        // Refresh the booking data to show the updated booking
        await mutate();
        closeEditModal();
        alert('예약이 데이터베이스에 업데이트되었습니다!');
      } catch (error) {
        console.error('Failed to update booking:', error);
        alert('예약 수정에 실패했습니다. 다시 시도해주세요.');
      }
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
        <MonthlyCalendarView
          currentMonth={currentMonth}
          bookings={bookings}
          onAddBooking={handleAddBooking}
          onBookingClick={handleBookingClick}
          onMonthChange={setCurrentMonth}
          monthlySummary={monthlySummary}
        />
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