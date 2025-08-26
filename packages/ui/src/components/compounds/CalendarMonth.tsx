'use client';

import {
  eachDayOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx } from 'clsx';
import React, { useState, useEffect } from 'react';
// import { Button } from '../primitives/Button'; // TODO: Use for navigation
import { Icon } from '../primitives/Icon';
import { BookingEntry } from '@entrip/shared';
import { BookingItem } from './BookingItem';
import { BookingTableExport } from './BookingTableExport';

export interface CalendarMonthProps<T extends BookingEntry = BookingEntry> {
  month?: Date;
  bookings?: Record<string, T[]>; // 'YYYY-MM-DD': T[] 형태
  onAddBooking?: (date: Date) => void;
  onBookingClick?: (booking: T) => void;
  onMonthChange?: (month: Date) => void;
  className?: string;
  monthlySummary?: {
    teamCount: number;
    paxCount: number;
    revenue: number;
    profit: number;
  };
}

export const CalendarMonth = <T extends BookingEntry = BookingEntry>({
  month: initialMonth = new Date(),
  bookings = {},
  onAddBooking,
  onBookingClick,
  onMonthChange,
  className,
  monthlySummary,
}: CalendarMonthProps<T>) => {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  
  // 외부에서 month prop이 변경될 때 반영
  useEffect(() => {
    setCurrentMonth(initialMonth);
  }, [initialMonth]);
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };
  
  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };
  
  return (
    <div className={clsx('calendar-month bg-white h-full flex flex-col', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 no-print">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <div className="flex items-center gap-3">
          <BookingTableExport 
            bookings={Object.values(bookings).flat()}
            title={`${format(currentMonth, 'yyyy년 M월', { locale: ko })} 캘린더`}
            viewType="calendar"
            monthlySummary={monthlySummary}
          />
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handlePrevMonth}
              aria-label="이전 달"
            >
              <Icon icon="ph:caret-left-bold" className="w-4 h-4 text-gray-600" />
            </button>
            <button
              className="px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700"
              onClick={() => setCurrentMonth(new Date())}
            >
              오늘
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handleNextMonth}
              aria-label="다음 달"
            >
              <Icon icon="ph:caret-right-bold" className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 캘린더 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 sticky top-0 bg-gray-50 border-b border-gray-200">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={clsx(
                  'py-3 text-center text-sm font-medium border-r border-gray-200 last:border-r-0',
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                )}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* 날짜 그리드 */}
          <div className="calendar-grid grid grid-cols-7">
            {days.map((day, dayIdx) => {
              const dateStr = format(day, 'yyyy-MM-dd'); // date-fns로 통일
              const dayBookings = bookings && bookings[dateStr] ? bookings[dateStr] : [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              // 디버깅을 위한 로그
              if (dayBookings.length > 0) {
                // Date: ${dateStr}, Bookings: dayBookings
              }
              
              return (
                <div
                  key={dayIdx}
                  tabIndex={0}
                  role="gridcell"
                  aria-label={format(day, 'yyyy년 M월 d일', { locale: ko })}
                  className={clsx(
                    'calendar-day calendar-day-cell group relative min-h-[80px] p-2 border-r border-b border-gray-200 cursor-pointer transition-all duration-200',
                    !isCurrentMonth && 'bg-gray-50 text-gray-400',
                    isToday(day) && 'today',
                    isCurrentMonth && 'bg-white hover:bg-gray-50'
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <time 
                      dateTime={dateStr}
                      className={clsx(
                        'text-sm font-medium',
                        isWeekend && isCurrentMonth && (day.getDay() === 0 ? 'text-red-600' : 'text-blue-600')
                      )}
                    >
                      {format(day, 'd')}
                    </time>
                    
                    {/* 날짜 셀 호버 시 + 버튼 표시 */}
                    {isCurrentMonth && onAddBooking && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddBooking(day);
                        }}
                        className="calendar-add-btn"
                        title="예약 추가"
                        aria-label={`${format(day, 'M월 d일', { locale: ko })}에 예약 추가`}
                      >
                        <Icon icon="ph:plus" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  {/* 예약 목록 */}
                  <ul className="space-y-1">
                    {dayBookings.slice(0, 4).map(booking => (
                      <div
                        key={booking.id}
                        className="calendar-event"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick?.(booking);
                        }}
                      >
                        <BookingItem booking={booking} />
                      </div>
                    ))}
                    {dayBookings.length > 4 && (
                      <li className="text-xs text-gray-500 pl-1.5 font-medium">
                        +{dayBookings.length - 4}개 더보기
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
