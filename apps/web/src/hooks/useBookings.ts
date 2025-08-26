/**
 * useBookings hook for Web app
 * 
 * This now uses the unified implementation from @entrip/shared
 * with WebSocket support and all existing features preserved
 */

import { useBookings as useBookingsUnified } from '@entrip/shared/hooks/useBookings';
import useSWR from 'swr';
import type { Booking } from '@entrip/shared/types/booking';
import apiClient from '../lib/api-client';
import { initializeSocket } from '../lib/socket';

// Fetcher for SWR
const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export function useBookings(month?: string) {
  // Initialize WebSocket
  const socket = initializeSocket();
  
  // Use the unified hook with configuration
  const result = useBookingsUnified({
    filters: month ? { month, take: 1000 } : { take: 1000 },
    enableWebSocket: !!socket,
    socketInstance: socket,
    apiClient,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    enableOptimisticUpdates: true,
  });
  
  // Return with the same interface as before
  return {
    bookings: result.bookings,
    pagination: result.pagination,
    isLoading: result.isLoading,
    isError: result.isError,
    mutate: result.mutate,
    // Additional properties for backward compatibility
    rawData: result.rawData,
    requestUrl: result.requestUrl,
    errorDetails: result.error?.message || result.error,
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