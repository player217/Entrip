'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { format, addDays, startOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useBookings, updateBooking } from '../../hooks/useBookings';
import StatusTag from '../../components/StatusTag';
import { logger, BookingStatus, type Booking } from '@entrip/shared';

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

interface WeekViewProps {
  currentDate: Date;
}

export default function WeekView({ currentDate }: WeekViewProps) {
  const { bookings, mutate } = useBookings();
  const [_isDragging, setIsDragging] = useState(false);
  
  // 주간 시작일 계산
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 월요일 시작
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // 날짜별로 예약 그룹화
  const bookingsByDate = weekDays.reduce((acc, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    acc[dateStr] = bookings.filter((booking: Booking) => 
      booking.startDate === dateStr
    );
    return acc;
  }, {} as Record<string, typeof bookings>);

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) return;
    
    const bookingId = result.draggableId;
    const newDate = result.destination.droppableId;
    
    const booking = bookings.find((b: Booking) => b.id === bookingId);
    if (!booking) return;
    
    // 날짜가 변경된 경우에만 업데이트
    if (booking.startDate !== newDate) {
      try {
        // Optimistic update
        await mutate(
          async (currentData: typeof bookings | undefined) => {
            return currentData?.map((b: Booking) =>
              b.id === bookingId ? { ...b, startDate: newDate } : b
            );
          },
          { revalidate: false }
        );
        
        // API 호출
        await updateBooking(bookingId, { startDate: newDate });
        
        // 서버 데이터로 갱신
        await mutate();
        
        logger.info('Booking moved', `${bookingId} to ${newDate} - PATCH 200`);
      } catch (error) {
        logger.error('Failed to update booking', error instanceof Error ? error.message : String(error));
        // 에러 시 롤백
        await mutate();
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
      <div className="grid grid-cols-7 gap-2 h-full">
        {weekDays.map((date, index) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
          
          return (
            <div key={dateStr} className={`border rounded-lg ${isToday ? 'border-blue-500' : 'border-gray-200'}`}>
              <div className={`p-2 text-center font-medium ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <div className="text-sm text-gray-500">
                  {format(date, 'EEE', { locale: ko })}
                </div>
                <div className={`text-lg ${isToday ? 'text-blue-600' : ''}`}>
                  {format(date, 'd')}
                </div>
              </div>
              
              <Droppable droppableId={dateStr}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2 min-h-[300px] ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                  >
                    {bookingsByDate[dateStr]?.map((booking: Booking, _index: number) => (
                      <Draggable
                        key={booking.id}
                        draggableId={booking.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 p-2 bg-white border rounded shadow-sm cursor-move ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="text-sm font-medium truncate">
                              {booking.customerName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {booking.destination}
                            </div>
                            <div className="mt-1">
                              <StatusTag status={convertBookingStatus(booking.status)} size="sm" className="" />
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
          );
        })}
      </div>
    </DragDropContext>
  );
}