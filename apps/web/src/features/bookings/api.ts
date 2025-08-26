/**
 * React Query implementation for bookings (v1 API)
 * 
 * @deprecated This uses the v1 API endpoints. Consider migrating to the unified
 * useBookings hook from '@entrip/shared/hooks/useBookings' which uses the
 * current API endpoints (/api/bookings).
 * 
 * Currently only used by BookingCreateModal component.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import type { Booking, NewTeamPayload as NewBooking } from '@entrip/shared';

// Query Keys
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: { page?: number; limit?: number; status?: string }) => 
    [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// Types
interface BookingListResponse {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
}

interface BookingListParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

// Hooks
export function useBookings(params: BookingListParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.status) queryParams.append('status', params.status);

  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => api.get<BookingListResponse>(
      `/api/v1/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    ),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => api.get<Booking>(`/api/v1/bookings/${id}`),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newBooking: NewBooking) => 
      api.post<Booking>('/api/v1/bookings', newBooking),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Booking> }) =>
      api.patch<Booking>(`/api/v1/bookings/${id}`, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      api.delete(`/api/v1/bookings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

// Specific status update hook
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Booking['status'] }) =>
      api.patch<Booking>(`/api/v1/bookings/${id}`, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}