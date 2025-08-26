'use client';

import React, { useState, useEffect } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isToday,
  addDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Icon } from '../primitives/Icon';
import { BookingItem } from './BookingItem';
import { BookingEntry } from '@entrip/shared';
import { BookingTableExport } from './BookingTableExport';

export interface CalendarWeekProps<T extends BookingEntry = BookingEntry> {
  week?: Date;
  bookings?: Record<string, T[]>; // 'YYYY-MM-DD': T[] 형태
  onAddBooking?: (date: Date) => void;
  onBookingClick?: (booking: T) => void;
  onWeekChange?: (week: Date) => void;
  className?: string;
  weeklySummary?: {
    teamCount: number;
    paxCount: number;
    revenue: number;
    profit: number;
  };
}

export const CalendarWeek = <T extends BookingEntry = BookingEntry>({
  week: initialWeek = new Date(),
  bookings = {},
  onAddBooking,
  onBookingClick,
  onWeekChange,
  className,
  weeklySummary
}: CalendarWeekProps<T>) => {
  const [currentWeek, setCurrentWeek] = useState(initialWeek);
  
  useEffect(() => {
    setCurrentWeek(initialWeek);
  }, [initialWeek]);
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const handlePrevWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onWeekChange?.(newWeek);
  };
  
  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onWeekChange?.(newWeek);
  };
  
  const handleToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    onWeekChange?.(today);
  };

  // 주차 계산
  const getWeekNumber = (date: Date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  return (
    <div className={clsx('bg-white h-full flex flex-col', className)}>
      {/* 헤더 - 월별 캘린더와 동일한 스타일 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentWeek, 'yyyy년 M월', { locale: ko })} {getWeekNumber(currentWeek)}번째 주
        </h2>
        <div className="flex items-center gap-3">
          <BookingTableExport 
            bookings={Object.values(bookings).flat()}
            title={`${format(currentWeek, 'yyyy년 M월', { locale: ko })} ${getWeekNumber(currentWeek)}번째 주 캘린더`}
            viewType="calendar"
            monthlySummary={weeklySummary}
          />
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handlePrevWeek}
              aria-label="이전 주"
            >
              <Icon icon="ph:caret-left-bold" className="w-4 h-4 text-gray-600" />
            </button>
            <button
              className="px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium text-gray-700"
              onClick={handleToday}
            >
              오늘
            </button>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={handleNextWeek}
              aria-label="다음 주"
            >
              <Icon icon="ph:caret-right-bold" className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* 주별 캘린더 그리드 - 월별 캘린더와 동일한 스타일 */}
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
          
          {/* 날짜 그리드 - 주별 캘린더는 1줄만, 하지만 세로로 길게 */}
          <div className="grid grid-cols-7">
            {days.map((day, dayIdx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookings && bookings[dateStr] ? bookings[dateStr] : [];
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              // 디버깅용 로그
              if (dayBookings.length > 0 && process.env.NODE_ENV === 'development') {
                console.log(`[CalendarWeek] ${dateStr} has ${dayBookings.length} bookings:`, dayBookings);
              }
              
              return (
                <div
                  key={dayIdx}
                  tabIndex={0}
                  role="gridcell"
                  aria-label={format(day, 'yyyy년 M월 d일', { locale: ko })}
                  className={clsx(
                    'calendar-day calendar-day-cell group relative min-h-[400px] p-2 border-r border-b border-gray-200 cursor-pointer transition-all duration-200',
                    isToday(day) && 'today',
                    'bg-white hover:bg-gray-50'
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <time 
                      dateTime={dateStr}
                      className={clsx(
                        'text-sm font-medium',
                        isWeekend && (day.getDay() === 0 ? 'text-red-600' : 'text-blue-600')
                      )}
                    >
                      {format(day, 'd')}
                    </time>
                    
                    {/* 날짜 셀 호버 시 + 버튼 표시 */}
                    {onAddBooking && (
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
                  
                  {/* 예약 목록 - 월간 캘린더와 동일한 스타일 */}
                  <ul className="space-y-1">
                    {dayBookings.slice(0, 6).map(booking => (
                      <div
                        key={booking.id}
                        className="calendar-event"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick?.(booking);
                        }}
                      >
                        <BookingItem booking={booking} variant="compact" />
                      </div>
                    ))}
                    {dayBookings.length > 6 && (
                      <li className="text-xs text-gray-500 pl-1.5 font-medium">
                        +{dayBookings.length - 6}개 더보기
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* 주간 합계는 WeeklySummaryFooter로 대체됨 */}
    </div>
  );
};