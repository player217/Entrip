/**
 * Unified useBookings Hook
 * 
 * This is the main hook that provides booking data management functionality
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import type { 
  BookingHookConfig, 
  BookingHookReturn,
  BookingEventCallbacks 
} from './types';
import type { Booking, CreateBookingDto, UpdateBookingDto } from '../../types/booking';
import { BookingService } from './BookingService';
import { SWRProvider } from './providers/SWRProvider';

/**
 * Main useBookings hook
 */
export function useBookings(
  config: BookingHookConfig = {}
): BookingHookReturn<Booking> {
  const {
    filters,
    enableWebSocket = false,
    socketInstance,
    revalidateOnFocus = false,
    revalidateOnReconnect = false,
    refreshInterval,
    enableOptimisticUpdates = true,
    apiClient: providedApiClient,
  } = config;
  
  // Get API client (use provided or get from context/global)
  const apiClient = providedApiClient || getDefaultApiClient();
  
  // Create data provider and service
  const provider = useMemo(() => new SWRProvider(apiClient), [apiClient]);
  const service = useMemo(() => new BookingService(provider, apiClient), [provider, apiClient]);
  
  // Build URL for SWR
  const url = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters) {
      if ('month' in filters && filters.month) {
        params.append('month', filters.month);
        params.append('take', String(filters.take || 1000));
      } else {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
    }
    
    const queryString = params.toString();
    return queryString ? `/api/bookings?${queryString}` : '/api/bookings';
  }, [filters]);
  
  // SWR hook for data fetching
  const { data, error, isLoading, mutate } = useSWR(
    url,
    (url) => provider.fetch(url),
    {
      revalidateOnFocus,
      revalidateOnReconnect,
      refreshInterval,
      onError: (err) => {
        console.error('[useBookings] Error:', err);
      },
      onSuccess: (data) => {
        console.log('[useBookings] Loaded:', data?.data?.length || 0, 'bookings');
      },
    }
  );
  
  // WebSocket integration
  useEffect(() => {
    if (!enableWebSocket || !socketInstance) return;
    
    const callbacks: BookingEventCallbacks = {
      onCreate: () => {
        console.log('[useBookings] WebSocket: booking created');
        mutate();
      },
      onUpdate: () => {
        console.log('[useBookings] WebSocket: booking updated');
        mutate();
      },
      onDelete: () => {
        console.log('[useBookings] WebSocket: booking deleted');
        mutate();
      },
      onBulkCreate: () => {
        console.log('[useBookings] WebSocket: bulk create');
        mutate();
      },
      onBulkDelete: () => {
        console.log('[useBookings] WebSocket: bulk delete');
        mutate();
      },
    };
    
    // Register event handlers
    if (callbacks.onCreate) socketInstance.on('booking:create', callbacks.onCreate);
    if (callbacks.onUpdate) socketInstance.on('booking:update', callbacks.onUpdate);
    if (callbacks.onDelete) socketInstance.on('booking:delete', callbacks.onDelete);
    if (callbacks.onBulkCreate) socketInstance.on('booking:bulk-create', callbacks.onBulkCreate);
    if (callbacks.onBulkDelete) socketInstance.on('booking:bulk-delete', callbacks.onBulkDelete);
    
    // Cleanup
    return () => {
      if (callbacks.onCreate) socketInstance.off('booking:create', callbacks.onCreate);
      if (callbacks.onUpdate) socketInstance.off('booking:update', callbacks.onUpdate);
      if (callbacks.onDelete) socketInstance.off('booking:delete', callbacks.onDelete);
      if (callbacks.onBulkCreate) socketInstance.off('booking:bulk-create', callbacks.onBulkCreate);
      if (callbacks.onBulkDelete) socketInstance.off('booking:bulk-delete', callbacks.onBulkDelete);
    };
  }, [enableWebSocket, socketInstance, mutate]);
  
  // Extract bookings from data
  const bookings = data?.data || [];
  const pagination = data?.pagination;
  
  // Actions
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);
  
  const create = useCallback(async (data: CreateBookingDto): Promise<Booking> => {
    if (enableOptimisticUpdates) {
      // Optimistic update
      const tempBooking = {
        ...data,
        id: 'temp-' + Date.now(),
        bookingNumber: 'TEMP-' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'current-user',
        status: 'PENDING',
        currency: 'KRW',
      } as any as Booking;
      
      await mutate(
        (currentData: any) => ({
          ...currentData,
          data: [...(currentData?.data || []), tempBooking],
        }),
        false
      );
    }
    
    try {
      const newBooking = await service.createBooking(data);
      await mutate(); // Revalidate
      return newBooking;
    } catch (error) {
      // Rollback on error
      await mutate();
      throw error;
    }
  }, [service, mutate, enableOptimisticUpdates]);
  
  const update = useCallback(async (id: string, data: UpdateBookingDto): Promise<Booking> => {
    if (enableOptimisticUpdates) {
      // Optimistic update
      await mutate(
        (currentData: any) => ({
          ...currentData,
          data: currentData?.data?.map((b: Booking) =>
            b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b
          ),
        }),
        false
      );
    }
    
    try {
      const updatedBooking = await service.updateBooking(id, data);
      await mutate(); // Revalidate
      return updatedBooking;
    } catch (error) {
      // Rollback on error
      await mutate();
      throw error;
    }
  }, [service, mutate, enableOptimisticUpdates]);
  
  const deleteBooking = useCallback(async (id: string): Promise<void> => {
    if (enableOptimisticUpdates) {
      // Optimistic update
      await mutate(
        (currentData: any) => ({
          ...currentData,
          data: currentData?.data?.filter((b: Booking) => b.id !== id),
        }),
        false
      );
    }
    
    try {
      await service.deleteBooking(id);
      await mutate(); // Revalidate
    } catch (error) {
      // Rollback on error
      await mutate();
      throw error;
    }
  }, [service, mutate, enableOptimisticUpdates]);
  
  const bulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    if (enableOptimisticUpdates) {
      // Optimistic update
      await mutate(
        (currentData: any) => ({
          ...currentData,
          data: currentData?.data?.filter((b: Booking) => !ids.includes(b.id)),
        }),
        false
      );
    }
    
    try {
      await service.bulkDeleteBookings(ids);
      await mutate(); // Revalidate
    } catch (error) {
      // Rollback on error
      await mutate();
      throw error;
    }
  }, [service, mutate, enableOptimisticUpdates]);
  
  const bulkRestore = useCallback(async (bookings: any[]): Promise<void> => {
    try {
      await service.bulkRestoreBookings(bookings);
      await mutate(); // Revalidate
    } catch (error) {
      throw error;
    }
  }, [service, mutate]);
  
  // Utilities
  const findById = useCallback((id: string) => {
    return bookings.find((b: Booking) => b.id === id);
  }, [bookings]);
  
  const filter = useCallback((predicate: (booking: Booking) => boolean) => {
    return bookings.filter(predicate);
  }, [bookings]);
  
  const sort = useCallback((compareFn: (a: Booking, b: Booking) => number) => {
    return [...bookings].sort(compareFn);
  }, [bookings]);
  
  return {
    // Data
    bookings,
    pagination,
    
    // Status
    isLoading,
    isError: !!error,
    error: error || null,
    
    // Actions
    refresh,
    create,
    update,
    delete: deleteBooking,
    bulkDelete,
    bulkRestore,
    
    // Utilities
    findById,
    filter,
    sort,
    
    // SWR compatibility
    mutate,
    rawData: data,
    requestUrl: url,
  };
}

/**
 * Get default API client
 * This should be implemented based on your app's setup
 */
function getDefaultApiClient() {
  // This is a placeholder - in real implementation, 
  // this would get the apiClient from context or a global store
  if (typeof window !== 'undefined' && (window as any).apiClient) {
    return (window as any).apiClient;
  }
  
  // Fallback - try to import from the new unified client
  try {
    const apiClient = require('../../../lib/apiClient').apiClient;
    return apiClient;
  } catch {
    console.warn('[useBookings] No API client found, please provide one in config');
    return null;
  }
}