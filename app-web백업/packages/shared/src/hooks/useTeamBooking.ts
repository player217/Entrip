import { useCallback, useEffect } from 'react';
import { useTeamBookingStore } from '../stores/teamBookingStore';
import type { TeamBookingFilters, TeamBooking } from '../types/team-booking';

// Types
interface Participant {
  id: string;
  name: string;
  role?: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: string;
}

// Removed SimpleTeamBooking interface - using imported TeamBooking type instead

// Hook for team booking list management
export function useTeamBookingList(initialFilters?: TeamBookingFilters) {
  const {
    bookings,
    filters,
    totalCount,
    isLoading,
    error,
    fetchBookings,
    setFilters,
    clearError
  } = useTeamBookingStore();

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    } else {
      fetchBookings();
    }
  }, [fetchBookings, initialFilters, setFilters]);

  const refresh = useCallback(() => {
    fetchBookings(filters);
  }, [fetchBookings, filters]);

  const updateFilters = useCallback((newFilters: TeamBookingFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  return {
    bookings,
    filters,
    totalCount,
    isLoading,
    error,
    refresh,
    updateFilters,
    clearError
  };
}

// Hook for single team booking detail
export function useTeamBookingDetail(bookingId?: string) {
  const {
    selectedBooking,
    isLoading,
    error,
    fetchBookingDetail,
    updateBooking,
    updateTransportation,
    updateAccommodations,
    addParticipants,
    updateParticipant,
    removeParticipant,
    updateCosts,
    addPayment,
    updatePayment,
    deletePayment,
    assignManagers,
    updateStatus,
    clearError
  } = useTeamBookingStore();

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetail(bookingId);
    }
  }, [bookingId, fetchBookingDetail]);

  const refresh = useCallback(() => {
    if (bookingId) {
      fetchBookingDetail(bookingId);
    }
  }, [bookingId, fetchBookingDetail]);

  return {
    booking: selectedBooking,
    isLoading,
    error,
    refresh,
    updateBooking: updateBooking.bind(null, bookingId!),
    updateTransportation: updateTransportation.bind(null, bookingId!),
    updateAccommodations: updateAccommodations.bind(null, bookingId!),
    addParticipants: addParticipants.bind(null, bookingId!),
    updateParticipant: (participantId: string, data: Partial<Participant>) => 
      updateParticipant(bookingId!, participantId, data),
    removeParticipant: (participantId: string) => 
      removeParticipant(bookingId!, participantId),
    updateCosts: updateCosts.bind(null, bookingId!),
    addPayment: addPayment.bind(null, bookingId!),
    updatePayment: (paymentId: string, data: Partial<Payment>) => 
      updatePayment(bookingId!, paymentId, data),
    deletePayment: (paymentId: string) => 
      deletePayment(bookingId!, paymentId),
    assignManagers: assignManagers.bind(null, bookingId!),
    updateStatus: (status: TeamBooking['status'], reason?: string) => 
      updateStatus(bookingId!, status, reason),
    clearError
  };
}

// Hook for calendar view
export function useTeamBookingCalendar() {
  const {
    bookings,
    selectedMonth,
    isLoading,
    error,
    setSelectedMonth,
    getBookingsByDate,
    fetchBookings,
    clearError
  } = useTeamBookingStore();

  useEffect(() => {
    const { year, month } = selectedMonth;
    // Create dates in local timezone to avoid UTC conversion issues
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    
    // Format as YYYY-MM-DD in local timezone
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    
    fetchBookings({ startDate, endDate, pageSize: 100 });
  }, [selectedMonth, fetchBookings]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const { year, month } = selectedMonth;
    if (direction === 'prev') {
      if (month === 1) {
        setSelectedMonth(year - 1, 12);
      } else {
        setSelectedMonth(year, month - 1);
      }
    } else {
      if (month === 12) {
        setSelectedMonth(year + 1, 1);
      } else {
        setSelectedMonth(year, month + 1);
      }
    }
  }, [selectedMonth, setSelectedMonth]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setSelectedMonth(today.getFullYear(), today.getMonth() + 1);
  }, [setSelectedMonth]);

  return {
    bookings,
    selectedMonth,
    isLoading,
    error,
    setSelectedMonth,
    navigateMonth,
    goToToday,
    getBookingsByDate,
    clearError
  };
}

// Hook for creating new bookings
export function useCreateTeamBooking() {
  const { createBooking, isCreating, error, clearError } = useTeamBookingStore();

  return {
    createBooking,
    isCreating,
    error,
    clearError
  };
}

// Hook for booking statistics
export function useTeamBookingStats(_filters?: {
  startDate?: string;
  endDate?: string;
  managerId?: string;
}) {
  const { bookings, getBookingsByStatus } = useTeamBookingStore();

  const stats = {
    total: bookings.length,
    draft: getBookingsByStatus('draft').length,
    confirmed: getBookingsByStatus('confirmed').length,
    inProgress: getBookingsByStatus('in_progress').length,
    completed: getBookingsByStatus('completed').length,
    cancelled: getBookingsByStatus('cancelled').length,
    totalParticipants: bookings.reduce((sum, booking) => sum + booking.totalCount, 0),
    totalRevenue: bookings.reduce((sum, booking) => {
      const revenue = 
        (booking.pricing.adultPrice * booking.adultCount) +
        (booking.pricing.childPrice * booking.childCount) +
        (booking.pricing.infantPrice * booking.infantCount);
      return sum + revenue;
    }, 0)
  };

  return stats;
}