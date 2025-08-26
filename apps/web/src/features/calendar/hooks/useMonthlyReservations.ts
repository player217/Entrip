import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api-client';
import type { Reservation } from '../types';

export const calendarKeys = {
  all: ['calendar'] as const,
  reservations: () => [...calendarKeys.all, 'reservations'] as const,
  monthly: (yyyyMM: string) => [...calendarKeys.reservations(), yyyyMM] as const,
};

export function useMonthlyReservations(yyyyMM: string) {
  return useQuery<Reservation[]>({
    queryKey: calendarKeys.monthly(yyyyMM),
    queryFn: () => api.get(`/api/v1/reservations?month=${yyyyMM}`),
    staleTime: 1000 * 60 * 10, // 10분
    gcTime: 1000 * 60 * 30, // 30분
  });
}