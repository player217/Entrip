'use client';

import React, { useState } from 'react';
import { format, getDay, isToday } from 'date-fns';
import { Plus } from 'lucide-react';
import { ReservationBadge } from './ReservationBadge';
import type { CalendarDayCellProps } from '../types';

export function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday: isTodayProp,
  reservations,
  isLoading,
  onAddClick,
}: CalendarDayCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  
  const dayOfWeek = getDay(date);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isTodayCell = isToday(date);
  
  // + 버튼 표시 조건
  const showAddButton = isTodayCell || isHovered || isSelected;

  return (
    <div
      className={`
        relative min-h-[120px] border-b border-r p-2 group transition-all
        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
        ${isTodayProp ? 'ring-2 ring-inset ring-primary' : ''}
        ${!isCurrentMonth ? 'text-gray-400' : ''}
        ${isHovered && isCurrentMonth ? 'ring-2 ring-orange-400/30' : ''}
        hover:bg-gray-50
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsSelected(!isSelected)}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-start justify-between mb-1">
        <span
          className={`
            text-xs font-semibold leading-none
            ${isSunday && isCurrentMonth ? 'text-red-600' : ''}
            ${isSaturday && isCurrentMonth ? 'text-blue-600' : ''}
            ${!isWeekend && isCurrentMonth ? 'text-gray-900' : ''}
            ${!isCurrentMonth ? 'text-gray-400' : ''}
            ${isTodayProp ? 'bg-primary text-white px-2 py-0.5 rounded-full' : ''}
          `}
        >
          {format(date, 'd')}
        </span>
        
        {isCurrentMonth && showAddButton && (
          <button
            className="p-1 hover:bg-gray-200 rounded transition-all z-[60]"
            aria-label="예약 추가"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick?.(date);
            }}
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
        )}
      </div>

      {/* 예약 목록 */}
      <div className="space-y-1">
        {reservations.slice(0, 4).map((reservation) => (
          <ReservationBadge key={reservation.id} reservation={reservation} />
        ))}
        
        {reservations.length > 4 && (
          <button className="text-xs text-gray-500 hover:text-gray-700 font-medium">
            +{reservations.length - 4} 더보기
          </button>
        )}
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm" />
      )}
    </div>
  );
}