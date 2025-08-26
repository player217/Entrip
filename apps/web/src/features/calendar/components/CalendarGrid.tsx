'use client';

import React from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import { Spinner } from '@entrip/ui';
import type { CalendarGridProps } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarGrid({ baseDate, reservations, isLoading, error, onAddClick }: CalendarGridProps) {
  // 캘린더에 표시할 날짜 범위 계산 (이전/다음 달 일부 포함)
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 날짜별 예약 그룹핑
  const reservationsByDate = reservations.reduce<Record<string, typeof reservations>>((acc, reservation) => {
    const dateKey = reservation.date; // YYYY-MM-DD format
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(reservation);
    return acc;
  }, {});

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-600">캘린더를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`px-2 py-3 text-center text-sm font-medium ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayReservations = reservationsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, baseDate);
          const isToday = isSameDay(day, new Date());

          return (
            <CalendarDayCell
              key={day.toISOString()}
              date={day}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              reservations={dayReservations}
              isLoading={isLoading}
              onAddClick={onAddClick}
            />
          );
        })}
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="md" className="" />
            <span className="text-sm text-gray-500">캘린더를 불러오고 있습니다...</span>
          </div>
        </div>
      )}
    </div>
  );
}