/**
 * Legacy compatibility layer for gradual migration
 * 
 * This file provides backward compatibility with existing implementations
 */

import { useBookings } from './useBookings';
import type { BookingHookConfig } from './types';
import type { Booking } from '../../types/booking';

/**
 * Legacy compatibility for apps/web/src/hooks/useBookings.ts
 * 
 * Usage:
 * const { bookings, isLoading, mutate } = useBookingsLegacy(month);
 */
export function useBookingsLegacy(month?: string) {
  // Get socket instance if available (for WebSocket support)
  let socketInstance;
  if (typeof window !== 'undefined') {
    try {
      // Try to get socket from the app's socket module
      const { getSocket } = require('../../../../apps/web/src/lib/socket');
      socketInstance = getSocket?.();
    } catch {
      // Socket not available
    }
  }
  
  // Get API client
  let apiClient;
  if (typeof window !== 'undefined') {
    try {
      // Try to get the unified API client
      apiClient = require('../../../../apps/web/src/lib/api-client').default;
    } catch {
      // Fallback to old axios instance
      try {
        apiClient = require('../../../../apps/web/src/lib/axios').default;
      } catch {
        console.warn('[useBookingsLegacy] No API client found');
      }
    }
  }
  
  const config: BookingHookConfig = {
    filters: month ? { month, take: 1000 } : undefined,
    enableWebSocket: !!socketInstance,
    socketInstance,
    apiClient,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    enableOptimisticUpdates: true,
  };
  
  const result = useBookings(config);
  
  // Map to old interface for backward compatibility
  return {
    bookings: result.bookings,
    pagination: result.pagination,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    mutate: result.mutate,
    // Additional properties from old implementation
    rawData: result.rawData,
    requestUrl: result.requestUrl,
    errorDetails: result.error?.message || result.error,
  };
}

/**
 * Standalone mutation functions for backward compatibility
 */
export async function createBooking(booking: Partial<Booking>) {
  // Get API client
  const apiClient = getApiClient();
  const response = await apiClient.post('/api/bookings', booking);
  return response.data;
}

export async function updateBooking(id: string, booking: Partial<Booking>) {
  const apiClient = getApiClient();
  const response = await apiClient.put(`/api/bookings/${id}`, booking);
  return response.data;
}

export async function deleteBooking(id: string) {
  const apiClient = getApiClient();
  const response = await apiClient.delete(`/api/bookings/${id}`);
  return response.data;
}

/**
 * Hook for single booking (backward compatibility)
 */
export function useBooking(id: string | null) {
  // For single booking, we'll fetch all and filter
  // since the API doesn't have a single booking endpoint in filters
  const config: BookingHookConfig = {
    filters: undefined, // Fetch all bookings
    apiClient: getApiClient(),
  };
  
  const { bookings, isLoading, isError, mutate } = useBookings(config);
  const booking = bookings.find(b => b.id === id) || null;
  
  return {
    booking,
    isLoading,
    isError,
    mutate,
  };
}

/**
 * Helper to get API client
 */
function getApiClient() {
  if (typeof window !== 'undefined') {
    try {
      // Try unified client first
      return require('../../../../apps/web/src/lib/api-client').default;
    } catch {
      try {
        // Fallback to old axios instance
        return require('../../../../apps/web/src/lib/axios').default;
      } catch {
        // Last resort - return a mock that will fail
        console.error('[useBookings] No API client available');
        return {
          get: () => Promise.reject(new Error('No API client')),
          post: () => Promise.reject(new Error('No API client')),
          put: () => Promise.reject(new Error('No API client')),
          delete: () => Promise.reject(new Error('No API client')),
        };
      }
    }
  }
  return null;
}