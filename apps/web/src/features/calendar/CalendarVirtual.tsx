'use client';

import { useMemo, memo, useCallback, useState, useEffect } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { clsx } from 'clsx';
import StatusTag from '../../components/StatusTag';
import { type Booking, BookingStatus } from '@entrip/shared';
import type { StatusType } from '@entrip/ui';

interface CalendarVirtualProps {
  currentDate: Date;
  bookings: Booking[];
  onDayClick?: (date: Date) => void;
  onBookingClick?: (booking: Booking) => void;
}

// Convert BookingStatus enum to StatusType
const mapBookingStatusToStatusType = (status: BookingStatus): StatusType => {
  switch (status) {
    case BookingStatus.PENDING:
      return 'pending';
    case BookingStatus.CONFIRMED:
      return 'confirmed';
    case BookingStatus.CANCELLED:
      return 'cancelled';
    default:
      return 'pending';
  }
};

// 개별 예약 아이템 - 메모이제이션으로 재렌더링 방지
const BookingItem = memo(({ booking, onClick }: { booking: Booking; onClick: (booking: Booking) => void }) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(booking);
  }, [booking, onClick]);

  return (
    <div
      className="text-xs p-1 bg-white border rounded cursor-pointer hover:shadow-sm"
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <span className="truncate font-medium">
          {booking.customerName}
        </span>
        <StatusTag status={mapBookingStatusToStatusType(booking.status)} size="sm" className="" />
      </div>
      <div className="text-gray-500 truncate">
        {booking.destination} · {booking.paxCount}명
      </div>
    </div>
  );
});

BookingItem.displayName = 'BookingItem';

// 셀 렌더러 - Grid를 위한 최적화
interface CellData {
  allDays: Date[];
  bookingsByDate: Map<string, Booking[]>;
  onDayClick?: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
  currentMonth: Date;
  daysPerWeek: number;
}

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: CellData;
}

const Cell = memo(({ columnIndex, rowIndex, style, data }: CellProps) => {
  const { allDays, bookingsByDate, onDayClick, onBookingClick, currentMonth, daysPerWeek } = data;
  const dayIndex = rowIndex * daysPerWeek + columnIndex;
  
  if (dayIndex >= allDays.length) return null;
  
  const date = allDays[dayIndex];
  if (!date) return null;
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayBookings = bookingsByDate.get(dateStr) || [];
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);
  
  return (
    <div
      style={style}
      data-testid="calendar-day"
      className={clsx(
        'p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50',
        !isCurrentMonth && 'bg-gray-50 text-gray-400',
        isTodayDate && 'bg-blue-50'
      )}
      onClick={() => onDayClick?.(date)}
    >
      <div className={clsx(
        'font-medium text-sm mb-1',
        isTodayDate && 'text-blue-600'
      )}>
        {format(date, 'd')}
      </div>
      
      {/* 예약 목록 (최대 3개 표시) */}
      <div className="space-y-1">
        {dayBookings.slice(0, 3).map((booking) => (
          <BookingItem
            key={`${booking.id}-${dateStr}`}
            booking={booking}
            onClick={onBookingClick}
          />
        ))}
        
        {dayBookings.length > 3 && (
          <div className="text-xs text-gray-500 text-center">
            +{dayBookings.length - 3}개 더보기
          </div>
        )}
      </div>
    </div>
  );
});

Cell.displayName = 'Cell';

const CalendarVirtualMemo = memo(function CalendarVirtual({ currentDate, bookings, onDayClick, onBookingClick }: CalendarVirtualProps) {
  // Window width state for responsive grid
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 월의 모든 날짜 계산 - 메모이제이션
  const { allDays } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 첫 번째 날의 요일 (0=일요일)
    const startDayOfWeek = monthStart.getDay();
    
    // 이전 달의 날짜들 추가
    const prevMonthDays = Array.from({ length: startDayOfWeek }, (_, i) => {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - (startDayOfWeek - i));
      return date;
    });
    
    // 다음 달의 날짜들 추가 (총 42일 = 6주)
    const totalDays = [...prevMonthDays, ...days];
    const remainingDays = 42 - totalDays.length;
    const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i + 1);
      return date;
    });
    
    const allDaysArray = [...totalDays, ...nextMonthDays];
    
    // 주별로 그룹화
    const weeksArray = [];
    for (let i = 0; i < allDaysArray.length; i += 7) {
      weeksArray.push(allDaysArray.slice(i, i + 7));
    }
    
    return { allDays: allDaysArray };
  }, [currentDate]);
  
  // 날짜별로 예약 그룹화 - 최적화된 메모이제이션
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach((booking) => {
      const date = booking.startDate;
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(booking);
    });
    return map;
  }, [bookings]);
  
  // 콜백 메모이제이션
  const handleDayClick = useCallback((date: Date) => {
    if (onDayClick) {
      onDayClick(date);
    }
  }, [onDayClick]);
  
  const handleBookingClick = useCallback((booking: Booking) => {
    if (onBookingClick) {
      onBookingClick(booking);
    }
  }, [onBookingClick]);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200" data-testid="calendar-virtual">
      {/* 요일 헤더 */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={clsx(
              'flex-1 py-3 text-center text-sm font-medium',
              index === 0 && 'text-red-500',
              index === 6 && 'text-blue-500'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Grid 가상 스크롤 적용된 캘린더 */}
      <Grid
        className="calendar-grid"
        data-testid="scroll-container"
        height={600} // 캘린더 높이
        width={windowWidth > 768 ? 800 : windowWidth - 32} // 반응형 너비
        rowCount={6} // 6주
        columnCount={7} // 7일
        rowHeight={100} // 각 행의 높이
        columnWidth={windowWidth > 768 ? 114 : Math.floor((windowWidth - 32) / 7)} // 각 열의 너비
        itemData={{
          allDays,
          bookingsByDate,
          onDayClick: handleDayClick,
          onBookingClick: handleBookingClick,
          currentMonth: currentDate,
          daysPerWeek: 7
        }}
      >
        {Cell}
      </Grid>
    </div>
  );
});

CalendarVirtualMemo.displayName = 'CalendarVirtual';

export default CalendarVirtualMemo;