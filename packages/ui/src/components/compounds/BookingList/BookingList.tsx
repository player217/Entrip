import React from 'react';
import { BookingType, BookingStatus, type Booking } from '@entrip/shared';

interface BookingListProps {
  bookings: Booking[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: BookingStatus) => void;
}

const statusColors: Record<BookingStatus, string> = {
  [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800',
  [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

const typeLabels: Record<BookingType, string> = {
  [BookingType.PACKAGE]: '패키지',
  [BookingType.FIT]: '자유여행',
  [BookingType.GROUP]: '단체',
  [BookingType.BUSINESS]: '비즈니스',
};

export function BookingList({ 
  bookings, 
  loading = false,
  onEdit, 
  onDelete,
  onStatusChange 
}: BookingListProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">예약이 없습니다</div>
        <div className="text-gray-400 text-sm mt-2">새로운 예약을 생성해보세요</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {booking.teamName}
                </h3>
                <span className="text-sm font-mono text-gray-500">
                  {booking.bookingNumber}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <div className="font-medium text-gray-900">고객정보</div>
                  <div>{booking.customerName}</div>
                  <div className="text-gray-500">{typeLabels[booking.bookingType]}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">여행정보</div>
                  <div>{booking.destination}</div>
                  <div className="text-gray-500">
                    {new Date(booking.startDate).toLocaleDateString()} ~ {new Date(booking.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500">{booking.paxCount}명, {booking.nights}박 {booking.days}일</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">금액정보</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {booking.totalPrice.toLocaleString()}원
                  </div>
                  {booking.depositAmount && (
                    <div className="text-gray-500">
                      계약금: {booking.depositAmount.toLocaleString()}원
                    </div>
                  )}
                </div>
              </div>
              
              {booking.user && (
                <div className="mt-3 text-xs text-gray-500">
                  담당자: {booking.user.name} ({booking.user.role})
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2 ml-4">
              {onEdit && (
                <button
                  onClick={() => onEdit(booking.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                >
                  수정
                </button>
              )}
              
              {onStatusChange && booking.status !== BookingStatus.CANCELLED && (
                <select
                  value={booking.status}
                  onChange={(e) => onStatusChange(booking.id, e.target.value as BookingStatus)}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value={BookingStatus.PENDING}>대기중</option>
                  <option value={BookingStatus.CONFIRMED}>확정</option>
                  <option value={BookingStatus.CANCELLED}>취소</option>
                </select>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(booking.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}