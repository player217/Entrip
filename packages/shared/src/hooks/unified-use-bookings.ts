'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '../lib/unified-api-client';
import { wsManager } from '../lib/websocket-manager';
import { BookingDTO, validateBookingDTO } from '../types/booking/dto';

interface UseBookingsConfig {
  enableRealtime?: boolean;
  onRealtimeUpdate?: (event: string, data: any) => void;
}

export function useBookings(
  params?: { month?: string; companyCode?: string },
  config: UseBookingsConfig = {}
) {
  const queryString = params ? new URLSearchParams(params).toString() : '';
  const key = `/api/bookings${queryString ? `?${queryString}` : ''}`;

  // SWR 설정
  const { data, error, isLoading, mutate } = useSWR<BookingDTO[]>(
    key,
    async () => {
      const response = await apiClient.get<BookingDTO[]>(key);
      // 타입 검증
      return response.map(validateBookingDTO);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  // WebSocket 실시간 동기화 - 부분 갱신 적용
  useEffect(() => {
    if (!config.enableRealtime) return;

    // WebSocket 연결 확인 및 초기화
    const initWebSocket = async () => {
      if (!wsManager.isConnected()) {
        await wsManager.connect();
      }
    };

    initWebSocket();

    // 부분 갱신 핸들러
    const handleBookingCreate = (newBooking: BookingDTO) => {
      mutate((current) => {
        if (!current) return [newBooking];
        return [...current, newBooking];
      }, false); // false = 재검증 안함
      
      config.onRealtimeUpdate?.('create', newBooking);
    };

    const handleBookingUpdate = (updatedBooking: BookingDTO) => {
      mutate((current) => {
        if (!current) return current;
        return current.map(booking => 
          booking.id === updatedBooking.id ? updatedBooking : booking
        );
      }, false);
      
      config.onRealtimeUpdate?.('update', updatedBooking);
    };

    const handleBookingDelete = (data: { id: string } | string) => {
      const deletedId = typeof data === 'string' ? data : data.id;
      
      mutate((current) => {
        if (!current) return current;
        return current.filter(booking => booking.id !== deletedId);
      }, false);
      
      config.onRealtimeUpdate?.('delete', deletedId);
    };

    const handleBulkCreate = (bookings: BookingDTO[]) => {
      mutate((current) => {
        if (!current) return bookings;
        return [...current, ...bookings];
      }, false);
      
      config.onRealtimeUpdate?.('bulk-create', bookings);
    };

    const handleBulkDelete = (data: { ids: string[] } | string[]) => {
      const ids = Array.isArray(data) ? data : data.ids;
      
      mutate((current) => {
        if (!current) return current;
        const idSet = new Set(ids);
        return current.filter(booking => !idSet.has(booking.id));
      }, false);
      
      config.onRealtimeUpdate?.('bulk-delete', ids);
    };

    // 이벤트 구독
    wsManager.on('booking:create', handleBookingCreate);
    wsManager.on('booking:update', handleBookingUpdate);
    wsManager.on('booking:delete', handleBookingDelete);
    wsManager.on('booking:bulk-create', handleBulkCreate);
    wsManager.on('booking:bulk-delete', handleBulkDelete);

    // Cleanup
    return () => {
      wsManager.off('booking:create', handleBookingCreate);
      wsManager.off('booking:update', handleBookingUpdate);
      wsManager.off('booking:delete', handleBookingDelete);
      wsManager.off('booking:bulk-create', handleBulkCreate);
      wsManager.off('booking:bulk-delete', handleBulkDelete);
    };
  }, [key, config.enableRealtime, config.onRealtimeUpdate, mutate]);

  // CRUD operations
  const createBooking = useCallback(async (booking: Partial<BookingDTO>) => {
    const response = await apiClient.post<BookingDTO>('/api/bookings', booking);
    
    // Optimistic update
    await mutate((current) => {
      if (!current) return [response];
      return [...current, response];
    }, false);
    
    return response;
  }, [mutate]);

  const updateBooking = useCallback(async (id: string, updates: Partial<BookingDTO>) => {
    const response = await apiClient.patch<BookingDTO>(`/api/bookings/${id}`, updates);
    
    // Optimistic update
    await mutate((current) => {
      if (!current) return current;
      return current.map(booking => 
        booking.id === id ? { ...booking, ...updates } : booking
      );
    }, false);
    
    return response;
  }, [mutate]);

  const deleteBooking = useCallback(async (id: string) => {
    await apiClient.delete(`/api/bookings/${id}`);
    
    // Optimistic update
    await mutate((current) => {
      if (!current) return current;
      return current.filter(booking => booking.id !== id);
    }, false);
  }, [mutate]);

  // 수동 새로고침
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    bookings: data || [],
    isLoading,
    error,
    createBooking,
    updateBooking,
    deleteBooking,
    refresh,
    mutate // 직접 mutate 노출 (고급 사용)
  };
}

// 기본 내보내기 (기존 코드 호환성)
export default useBookings;