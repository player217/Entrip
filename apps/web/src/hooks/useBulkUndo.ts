import React, { useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../lib/api-client';
import { logger } from '@entrip/shared';

interface UndoItem {
  id: string;
  [key: string]: unknown;
}

interface UndoState {
  type: 'delete';
  data: UndoItem[];
  timestamp: number;
}

export const useBulkUndo = () => {
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const addUndoItem = useCallback((type: 'delete', data: UndoItem[]) => {
    const undoItem: UndoState = {
      type,
      data,
      timestamp: Date.now()
    };

    setUndoStack(prev => [...prev, undoItem]);

    // 기존 타이머 취소
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // Undo handler function
    const doUndo = async () => {
      try {
        if (undoItem.type === 'delete') {
          // 삭제된 항목들을 복원
          const response = await apiClient.post('/api/bookings/bulk-restore', {
            bookings: undoItem.data
          });

          if (response.status === 200) {
            toast.success(`${undoItem.data.length}개 항목이 복원되었습니다`);
            
            // Toast 닫기
            if (toastIdRef.current) {
              toast.dismiss(toastIdRef.current);
            }
            
            // Undo stack에서 제거
            setUndoStack(prev => prev.filter(item => item !== undoItem));
            
            // 타이머 정리
            if (undoTimerRef.current) {
              clearTimeout(undoTimerRef.current);
              undoTimerRef.current = null;
            }
            
            return true;
          }
        }
      } catch (error) {
        logger.error('Undo 실패:', error instanceof Error ? error.message : String(error));
        toast.error('복원에 실패했습니다');
      }
      
      return false;
    };

    // Toast 표시
    toastIdRef.current = toast.info(
      React.createElement('div', { className: "flex items-center justify-between" },
        React.createElement('span', {}, `${data.length}개 항목이 삭제되었습니다`),
        React.createElement('button', {
          onClick: doUndo,
          className: "ml-4 px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50"
        }, '실행 취소')
      ),
      {
        autoClose: 5000,
        closeButton: false,
        onClose: () => {
          // Toast가 닫히면 undo stack에서 제거
          setUndoStack(prev => prev.filter(item => item !== undoItem));
        }
      }
    );

    // 5초 후 자동으로 undo stack에서 제거
    undoTimerRef.current = setTimeout(() => {
      setUndoStack(prev => prev.filter(item => item !== undoItem));
      toastIdRef.current = null;
    }, 5000);
  }, []);


  const clearUndo = useCallback(() => {
    setUndoStack([]);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  }, []);

  return {
    addUndoItem,
    clearUndo,
    hasUndo: undoStack.length > 0
  };
};