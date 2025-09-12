'use client';

import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx } from 'clsx';
import { Icon } from '../primitives/Icon';
import { BookingEntry, BookingStatus } from '@entrip/shared';
import { BookingTableExport } from './BookingTableExport';

interface MonthlyListViewProps {
  bookings: BookingEntry[];
  month?: Date;
  onMonthChange?: (month: Date) => void;
  onBookingClick?: (booking: BookingEntry) => void;
  className?: string;
}

export const MonthlyListView: React.FC<MonthlyListViewProps> = ({
  bookings = [],
  month: initialMonth = new Date(),
  onMonthChange,
  onBookingClick,
  className
}) => {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // 해당 월의 예약만 필터링
  const monthlyBookings = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookings, currentMonth]);

  // 통계 계산
  const stats = useMemo(() => {
    const confirmed = monthlyBookings.filter(b => b.status === BookingStatus.CONFIRMED);
    const pending = monthlyBookings.filter(b => b.status === BookingStatus.PENDING);
    const cancelled = monthlyBookings.filter(b => b.status === BookingStatus.CANCELLED);
    
    const totalPax = confirmed.reduce((sum, booking) => sum + (booking.paxCount || 0), 0);
    const totalRevenue = confirmed.reduce((sum, booking) => sum + (booking.revenue || 0), 0);
    const totalCost = confirmed.reduce((sum, booking) => sum + (booking.cost || 0), 0);
    
    return {
      total: monthlyBookings.length,
      confirmed: confirmed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      totalPax,
      totalRevenue,
      profit: totalRevenue - totalCost
    };
  }, [monthlyBookings]);

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

  const getStatusBadge = (status: BookingStatus) => {
    const styles = {
      [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800',
      [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      [BookingStatus.CONFIRMED]: '확정',
      [BookingStatus.PENDING]: '대기',
      [BookingStatus.CANCELLED]: '취소'
    };

    return (
      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status])}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className={clsx('bg-white h-full flex flex-col', className)}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })} 예약 목록
          </h2>
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
              이번 달
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
        
        <div className="flex items-center gap-6">
          {/* 월간 통계 */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-gray-500">총 팀수</div>
              <div className="font-semibold text-gray-900">{stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">확정</div>
              <div className="font-semibold text-green-600">{stats.confirmed}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">대기</div>
              <div className="font-semibold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">인원</div>
              <div className="font-semibold text-blue-600">{stats.totalPax}명</div>
            </div>
          </div>
          
          {/* 출력 버튼 */}
          <BookingTableExport 
            bookings={monthlyBookings}
            title={`${format(currentMonth, 'yyyy년 M월', { locale: ko })} 예약 목록`}
          />
        </div>
      </div>

      {/* 예약 목록 */}
      <div className="flex-1 overflow-auto p-4">
        {monthlyBookings.length === 0 ? (
          <div className="text-center py-12">
            <Icon icon="ph:calendar-x" className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <div className="text-gray-500 text-lg">
              {format(currentMonth, 'M월', { locale: ko })}에 예약이 없습니다
            </div>
            <div className="text-gray-400 text-sm mt-2">다른 월을 확인해보세요</div>
          </div>
        ) : (
          <div className="space-y-2">
            {monthlyBookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-gray-200 rounded-md p-3 bg-white hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onBookingClick?.(booking)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {booking.name}
                      </h3>
                      {getStatusBadge(booking.status)}
                      <span className="text-xs text-gray-500">
                        {format(new Date(booking.date), 'M월 d일', { locale: ko })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                      <div>
                        <span className="text-gray-500">담당자: </span>
                        <span className="font-medium">{booking.manager}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">인원: </span>
                        <span className="font-medium">{booking.paxCount}명</span>
                      </div>
                      <div>
                        <span className="text-gray-500">매출: </span>
                        <span className="font-medium text-blue-600">
                          {booking.revenue?.toLocaleString() || '-'}원
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">수익: </span>
                        <span className="font-medium text-green-600">
                          {booking.revenue && booking.cost ? 
                            (booking.revenue - booking.cost).toLocaleString() : '-'}원
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-2">
                    <Icon icon="ph:caret-right" className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 합계 */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex justify-between items-center text-sm">
          <div className="flex gap-6">
            <span>총 팀수: <strong>{stats.total}</strong></span>
            <span>총 인원: <strong>{stats.totalPax}명</strong></span>
          </div>
          <div className="flex gap-6">
            <span>총 매출: <strong className="text-blue-600">{stats.totalRevenue.toLocaleString()}원</strong></span>
            <span>총 수익: <strong className="text-green-600">{stats.profit.toLocaleString()}원</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};