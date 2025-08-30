/**
 * useBookings hook for Web app
 * 
 * This uses the web app's proxy routes to access the backend API
 * with proper cookie authentication and WebSocket support
 */

import useSWR from 'swr';
import type { Booking } from '@entrip/shared/types/booking';
import apiClient from '../lib/api-client';
import { initializeSocket } from '../lib/socket';
import { useEffect } from 'react';

// Fetcher for SWR
const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export function useBookings(month?: string) {
  // Build query parameters
  const params = new URLSearchParams();
  if (month) {
    params.append('month', month);
  }
  params.append('take', '1000');
  
  const queryString = params.toString();
  const url = `/api/bookings${queryString ? `?${queryString}` : ''}`;
  
  // Use SWR to fetch bookings through the proxy
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute deduplication
  });
  
  // Initialize WebSocket for real-time updates
  const socket = initializeSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Listen for booking events
    const handleBookingUpdate = () => {
      console.log('[useBookings] Booking updated via WebSocket');
      mutate(); // Refresh the data
    };
    
    socket.on('booking:create', handleBookingUpdate);
    socket.on('booking:update', handleBookingUpdate);
    socket.on('booking:delete', handleBookingUpdate);
    socket.on('booking:bulk-create', handleBookingUpdate);
    socket.on('booking:bulk-delete', handleBookingUpdate);
    
    return () => {
      socket.off('booking:create', handleBookingUpdate);
      socket.off('booking:update', handleBookingUpdate);
      socket.off('booking:delete', handleBookingUpdate);
      socket.off('booking:bulk-create', handleBookingUpdate);
      socket.off('booking:bulk-delete', handleBookingUpdate);
    };
  }, [socket, mutate]);
  
  // Return with unified response schema
  return {
    bookings: data?.data ?? [],             // ← 응답 스키마 통일: 항상 배열 반환 (?? 사용)
    pagination: data?.pagination || { page: 1, limit: 1000, total: 0, totalPages: 0 },
    isLoading,
    isError: Boolean(error),               // ← Boolean으로 명시적 변환
    mutate,
    // Additional properties for backward compatibility
    rawData: data,
    requestUrl: url,
    errorDetails: error?.message || error,
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
  const response = await apiClient.post('/api/bookings', booking);
  return response.data;
}

export async function updateBooking(id: string, booking: Partial<Booking>) {
  const response = await apiClient.put(`/api/bookings/${id}`, booking);
  return response.data;
}

export async function deleteBooking(id: string) {
  const response = await apiClient.delete(`/api/bookings/${id}`);
  return response.data;
}