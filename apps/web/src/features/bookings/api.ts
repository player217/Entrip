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
import { api } from '@/lib/api-client';
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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BookingListParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'cancelled';
  month?: string; // Add month parameter for consistency
}

// Hooks
export function useBookings(params: BookingListParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('take', params.limit.toString()); // Use 'take' to match SWR version
  else queryParams.append('take', '1000'); // Default to match SWR version
  if (params.status) queryParams.append('status', params.status);
  if (params.month) queryParams.append('month', params.month);

  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => api.get<BookingListResponse>(
      `/api/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    ),
    // 응답 스키마 통일: SWR과 동일한 형태로 변환
    select: (response) => ({
      bookings: response.data?.data ?? [],         // ← 응답 스키마 통일
      pagination: response.data?.pagination || { page: 1, limit: 1000, total: 0, totalPages: 0 },
      rawData: response.data,
    }),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Booking>(`/api/bookings/${id}`);
      return response.data; // Extract data from AxiosResponse
    },
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newBooking: NewBooking) => {
      const response = await api.post<Booking>('/api/bookings', newBooking);
      return response.data; // Extract data from AxiosResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      const response = await api.patch<Booking>(`/api/bookings/${id}`, data);
      return response.data; // Extract data from AxiosResponse
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/bookings/${id}`);
      return response.data; // Extract data from AxiosResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
    },
  });
}

// Specific status update hook
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Booking['status'] }) => {
      const response = await api.patch<Booking>(`/api/bookings/${id}`, { status });
      return response.data; // Extract data from AxiosResponse
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}