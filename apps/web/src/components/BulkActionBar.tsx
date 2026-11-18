'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useBookings, deleteBooking } from '../hooks/useBookings';
import { toast } from 'react-toastify';
import { Booking, logger } from '@entrip/shared';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export default function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const { bookings, mutate } = useBookings();
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (selectedIds.length === 0) return null;
  
  const handleBulkDelete = async () => {
    if (!window.confirm(`선택한 예약 ${selectedIds.length}건을 삭제할까요?`)) return;
    setIsDeleting(true);
    let deleted = 0;
    try {
      const selected = bookings.filter((booking: Booking) => selectedIds.includes(booking.id));
      if (selected.length !== selectedIds.length) throw new Error('선택한 예약을 모두 불러오지 못했습니다. 새로고침 후 다시 선택하세요.');
      for (const booking of selected) {
        await deleteBooking(booking.id, { ifMatch: booking.version });
        deleted += 1;
      }
      onClearSelection();
      toast.success(`${deleted}건의 예약을 삭제했습니다.`);
    } catch (error) {
      logger.error('[BulkActionBar]', 'Bulk delete failed:', error);
      toast.error(`${deleted}건 삭제 완료. ${error instanceof Error ? error.message : '나머지 삭제에 실패했습니다.'}`);
    } finally {
      await mutate();
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 z-50">
      <span className="text-sm">
        {selectedIds.length}개 선택됨
      </span>
      
      <button
        onClick={handleBulkDelete}
        disabled={isDeleting}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50"
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? '삭제 중...' : '선택 삭제'}
      </button>
      
      <button
        onClick={onClearSelection}
        className="p-1.5 hover:bg-gray-800 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}