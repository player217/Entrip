'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import apiClient from '../lib/api-client';
import { useBookings } from '../hooks/useBookings';
import { useBulkUndo } from '../hooks/useBulkUndo';
import { toast } from 'react-toastify';
import { logger } from '@entrip/shared';

interface BulkActionBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export default function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const { bookings, mutate } = useBookings();
  const [isDeleting, setIsDeleting] = useState(false);
  const { addUndoItem } = useBulkUndo();
  
  if (selectedIds.length === 0) return null;
  
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    
    try {
      // 삭제될 예약 데이터를 저장
      const deletedBookings = bookings.filter(booking => selectedIds.includes(booking.id));
      
      // Optimistic update - 선택된 항목들을 즉시 제거
      await mutate(
        async (currentData: typeof bookings | undefined) => {
          return currentData?.filter((booking) => 
            !selectedIds.includes(booking.id)
          );
        },
        { revalidate: false }
      );
      
      // API 호출
      const response = await apiClient.delete('/api/bookings/bulk', {
        data: { ids: selectedIds }
      });
      
      logger.info('[BulkActionBar]', `Bulk delete successful - DELETE 200, deleted: ${response.data.deleted}`);
      
      // Undo 스택에 추가 - Booking을 UndoItem으로 타입 변환
      addUndoItem('delete', deletedBookings as any[]);
      
      // 성공 후 서버 데이터로 갱신
      await mutate();
      
      // 선택 초기화
      onClearSelection();
    } catch (error) {
      logger.error('[BulkActionBar]', 'Bulk delete failed:', error);
      toast.error('삭제에 실패했습니다');
      // 실패 시 롤백
      await mutate();
    } finally {
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