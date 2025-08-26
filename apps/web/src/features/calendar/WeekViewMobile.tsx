'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useBookings, updateBooking } from '../../hooks/useBookings';
import StatusTag from '../../components/StatusTag';
import { useSwipeable } from 'react-swipeable';
import { logger, BookingStatus } from '@entrip/shared';

// BookingStatus enum을 StatusTag의 StatusType으로 변환
const convertBookingStatus = (status: BookingStatus): 'pending' | 'confirmed' | 'cancelled' | 'completed' => {
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

// react-beautiful-dnd를 동적으로 import (SSR 이슈 해결)
const DragDropContext = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.DragDropContext),
  { ssr: false }
);
const Droppable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Droppable),
  { ssr: false }
);
const Draggable = dynamic(
  () => import('react-beautiful-dnd').then(mod => mod.Draggable),
  { ssr: false }
);

interface WeekViewMobileProps {
  currentDate: Date;
}

export default function WeekViewMobile({ currentDate }: WeekViewMobileProps) {
  const { bookings, mutate } = useBookings();
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(currentDate);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 스와이프 핸들러
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isTransitioning) {
        setIsTransitioning(true);
        setCurrentWeek(prev => addWeeks(prev, 1));
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    onSwipedRight: () => {
      if (!isTransitioning) {
        setIsTransitioning(true);
        setCurrentWeek(prev => subWeeks(prev, 1));
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    delta: 50, // 최소 스와이프 거리
  });
  
  // 주간 시작일 계산
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // 월요일 시작
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // 날짜별로 예약 그룹화
  const bookingsByDate = weekDays.reduce((acc, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    acc[dateStr] = bookings.filter(booking => 
      booking.startDate === dateStr
    );
    return acc;
  }, {} as Record<string, typeof bookings>);

  const handleDragEnd = async (result: import('react-beautiful-dnd').DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) return;
    
    const bookingId = result.draggableId;
    const newDate = result.destination.droppableId;
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // 날짜가 변경된 경우에만 업데이트
    if (booking.startDate !== newDate) {
      try {
        // Optimistic update
        await mutate(
          async (currentData: typeof bookings | undefined) => {
            return currentData?.map((b) =>
              b.id === bookingId ? { ...b, startDate: newDate } : b
            );
          },
          { revalidate: false }
        );
        
        // API 호출
        await updateBooking(bookingId, { startDate: newDate });
        
        // 서버 데이터로 갱신
        await mutate();
        
        logger.info('[Mobile] Booking moved', `${bookingId} to ${newDate} - PATCH 200`);
      } catch (error) {
        logger.error('Failed to update booking', error instanceof Error ? error.message : String(error));
        // 에러 시 롤백
        await mutate();
      }
    }
  };

  if (!isMounted) {
    return <div className="h-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <DragDropContext 
      onDragEnd={handleDragEnd} 
      onDragStart={() => setIsDragging(true)}
    >
      {/* 주간 헤더 */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(prev => subWeeks(prev, 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ‹
        </button>
        <h3 className="font-medium">
          {format(weekStart, 'yyyy년 M월')} {format(weekStart, 'd일')} - {format(addDays(weekStart, 6), 'd일')}
        </h3>
        <button
          onClick={() => setCurrentWeek(prev => addWeeks(prev, 1))}
          className="p-2 hover:bg-gray-100 rounded"
        >
          ›
        </button>
      </div>
      
      {/* 모바일 최적화: 스크롤 가능한 가로 레이아웃 */}
      <div 
        {...handlers} 
        className={`flex overflow-x-auto snap-x snap-mandatory h-full transition-all duration-300 ${
          isTransitioning ? 'opacity-50' : ''
        }`}
      >
        {weekDays.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          return (
            <div 
              key={dateStr} 
              className="flex-shrink-0 w-full sm:w-80 snap-center px-2"
            >
              <div className={`border rounded-lg h-full ${isToday ? 'border-blue-500' : 'border-gray-200'}`}>
                <div className={`p-3 text-center font-medium sticky top-0 z-10 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="text-sm text-gray-500">
                    {format(date, 'EEE', { locale: ko })}
                  </div>
                  <div className={`text-lg ${isToday ? 'text-blue-600' : ''}`}>
                    {format(date, 'M월 d일')}
                  </div>
                </div>
                
                <Droppable droppableId={dateStr}>
                  {(provided: import('react-beautiful-dnd').DroppableProvided, snapshot: import('react-beautiful-dnd').DroppableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 min-h-[400px] ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                      style={{
                        touchAction: isDragging ? 'none' : 'auto', // 드래그 중 스크롤 방지
                      }}
                    >
                      {bookingsByDate[dateStr]?.map((booking, index) => (
                        <Draggable
                          key={booking.id}
                          draggableId={booking.id}
                          index={index}
                        >
                          {(provided: import('react-beautiful-dnd').DraggableProvided, snapshot: import('react-beautiful-dnd').DraggableStateSnapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 p-3 bg-white border rounded-lg shadow-sm ${
                                snapshot.isDragging ? 'shadow-lg opacity-90' : ''
                              }`}
                              style={{
                                ...provided.draggableProps.style,
                                touchAction: 'manipulation', // 터치 최적화
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium truncate text-sm">
                                  {booking.customerName}
                                </div>
                                <div className="flex-shrink-0 ml-2">
                                  <StatusTag status={convertBookingStatus(booking.status)} size="sm" className="" />
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {booking.destination} · {booking.paxCount}명
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}