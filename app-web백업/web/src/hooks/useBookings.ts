import { useEffect } from 'react';
import useSWR from 'swr';
import axiosInstance from '../lib/axios';
import type { Booking } from '@entrip/shared';
import { initializeSocket, subscribeToBookingEvents, unsubscribeFromBookingEvents } from '../lib/socket';

// Fetcher function for SWR
const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

export function useBookings(month?: string) {
  const url = month 
    ? `/api/bookings?month=${month}&take=1000`
    : '/api/bookings?take=1000';
    
  const { data, error, isLoading, mutate } = useSWR<{data: Booking[], pagination: any}>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    // WebSocket 초기화
    const socket = initializeSocket();
    
    if (socket) {
      // WebSocket 이벤트 구독
      subscribeToBookingEvents({
        onCreate: (_event) => {
          // console.log('[useBookings] booking:create event received', event.bookingId);
          mutate(); // SWR 캐시 갱신
        },
        onUpdate: (_event) => {
          // console.log('[useBookings] booking:update event received', event.bookingId);
          mutate(); // SWR 캐시 갱신
        },
        onDelete: (_event) => {
          // console.log('[useBookings] booking:delete event received', event.bookingId);
          mutate(); // SWR 캐시 갱신
        },
        onBulkCreate: (_event) => {
          // console.log('[useBookings] booking:bulk-create event received', event.count);
          mutate(); // SWR 캐시 갱신
        },
        onBulkDelete: (_event) => {
          // console.log('[useBookings] booking:bulk-delete event received', event.count);
          mutate(); // SWR 캐시 갱신
        }
      });
    }
    
    // Cleanup
    return () => {
      unsubscribeFromBookingEvents();
    };
  }, [mutate]); // mutate 함수를 의존성 배열에 추가

  return {
    bookings: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for single booking
export function useBooking(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Booking>(
    id ? `/api/bookings/${id}` : null,
    fetcher
  );

  return {
    booking: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// Mutation functions
export async function createBooking(booking: Partial<Booking>) {
  const response = await axiosInstance.post('/api/bookings', booking);
  return response.data;
}

export async function updateBooking(id: string, booking: Partial<Booking>) {
  const response = await axiosInstance.put(`/api/bookings/${id}`, booking);
  return response.data;
}

export async function deleteBooking(id: string) {
  const response = await axiosInstance.delete(`/api/bookings/${id}`);
  return response.data;
}