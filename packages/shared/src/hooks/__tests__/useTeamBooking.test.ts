import { renderHook, act } from '@testing-library/react';
import { useTeamBookingList, useTeamBookingDetail, useTeamBookingCalendar, useCreateTeamBooking, useTeamBookingStats } from '../useTeamBooking';
import { useTeamBookingStore } from '../../stores/teamBookingStore';
import type { TeamBooking } from '../../types/team-booking';

// Mock the teamBookingService
jest.mock('../../services/teamBookingService');

// Mock zustand store
jest.mock('../../stores/teamBookingStore');

describe('useTeamBooking hooks', () => {
  const mockBooking: TeamBooking = {
    id: '1',
    bookingNumber: 'BK-2025-001',
    teamCode: 'TEAM001',
    tourName: '삼성전자 연수팀 방콕 투어',
    destination: '방콕',
    tourType: 'incentive',
    departureDate: '2025-06-15',
    returnDate: '2025-06-20',
    nights: 5,
    days: 6,
    transportation: {
      outbound: { flights: [] },
      inbound: { flights: [] }
    },
    accommodations: [],
    participants: [],
    adultCount: 43,
    childCount: 2,
    infantCount: 0,
    totalCount: 45,
    costs: [],
    pricing: {
      adultPrice: 2000000,
      childPrice: 1500000,
      infantPrice: 0,
      currency: 'KRW'
    },
    settlement: {
      totalRevenue: 89000000,
      totalCost: 65000000,
      profit: 24000000,
      profitMargin: 27,
      payments: [],
      outstandingBalance: 89000000
    },
    customer: {
      organizationName: '삼성전자',
      organizationType: 'company',
      contacts: [{
        name: '김부장',
        phone: '010-1234-5678',
        email: 'kim@samsung.com',
        relationship: 'primary'
      }]
    },
    managers: [{
      id: 'manager-1',
      name: '김엔트립',
      role: 'main',
      phone: '010-9999-8888',
      email: 'kim@entrip.com'
    }],
    mainManagerId: 'manager-1',
    status: 'confirmed',
    createdAt: '2025-05-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2025-05-15T00:00:00Z',
    updatedBy: 'user-1'
  };

  const mockStore = {
    bookings: [mockBooking],
    filters: {},
    totalCount: 1,
    isLoading: false,
    error: null,
    fetchBookings: jest.fn(),
    setFilters: jest.fn(),
    clearError: jest.fn(),
    selectedBooking: null,
    fetchBookingDetail: jest.fn(),
    updateBooking: jest.fn(),
    updateTransportation: jest.fn(),
    updateAccommodations: jest.fn(),
    addParticipants: jest.fn(),
    updateParticipant: jest.fn(),
    removeParticipant: jest.fn(),
    updateCosts: jest.fn(),
    addPayment: jest.fn(),
    updatePayment: jest.fn(),
    deletePayment: jest.fn(),
    assignManagers: jest.fn(),
    updateStatus: jest.fn(),
    selectedMonth: { year: 2025, month: 6 },
    setSelectedMonth: jest.fn(),
    getBookingsByDate: jest.fn(),
    createBooking: jest.fn(),
    isCreating: false,
    getBookingsByStatus: jest.fn((status) => 
      mockStore.bookings.filter(b => b.status === status)
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTeamBookingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  describe('useTeamBookingList', () => {
    it('should fetch bookings on mount', () => {
      renderHook(() => useTeamBookingList());
      
      expect(mockStore.fetchBookings).toHaveBeenCalledTimes(1);
    });

    it('should set initial filters if provided', () => {
      const initialFilters = { status: ['confirmed' as const] };
      renderHook(() => useTeamBookingList(initialFilters));
      
      expect(mockStore.setFilters).toHaveBeenCalledWith(initialFilters);
    });

    it('should update filters when updateFilters is called', () => {
      const { result } = renderHook(() => useTeamBookingList());
      const newFilters = { status: ['draft' as const] };
      
      act(() => {
        result.current.updateFilters(newFilters);
      });
      
      expect(mockStore.setFilters).toHaveBeenCalledWith(newFilters);
    });

    it('should refresh bookings with current filters', () => {
      mockStore.filters = { status: ['confirmed' as const] };
      const { result } = renderHook(() => useTeamBookingList());
      
      act(() => {
        result.current.refresh();
      });
      
      expect(mockStore.fetchBookings).toHaveBeenCalledWith({ status: ['confirmed' as const] });
    });

    it('should return bookings and state', () => {
      const { result } = renderHook(() => useTeamBookingList());
      
      expect(result.current.bookings).toEqual([mockBooking]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('useTeamBookingDetail', () => {
    it('should fetch booking detail on mount with bookingId', () => {
      renderHook(() => useTeamBookingDetail('booking-1'));
      
      expect(mockStore.fetchBookingDetail).toHaveBeenCalledWith('booking-1');
    });

    it('should not fetch if no bookingId provided', () => {
      renderHook(() => useTeamBookingDetail());
      
      expect(mockStore.fetchBookingDetail).not.toHaveBeenCalled();
    });

    it('should bind bookingId to update methods', () => {
      mockStore.selectedBooking = mockBooking;
      const { result } = renderHook(() => useTeamBookingDetail('booking-1'));
      
      const updates = { memo: 'Updated memo' };
      result.current.updateBooking(updates);
      
      expect(mockStore.updateBooking).toHaveBeenCalledWith('booking-1', updates);
    });

    it('should handle participant operations', () => {
      const { result } = renderHook(() => useTeamBookingDetail('booking-1'));
      
      result.current.updateParticipant('participant-1', { name: 'Updated Name' });
      expect(mockStore.updateParticipant).toHaveBeenCalledWith('booking-1', 'participant-1', { name: 'Updated Name' });
      
      result.current.removeParticipant('participant-1');
      expect(mockStore.removeParticipant).toHaveBeenCalledWith('booking-1', 'participant-1');
    });

    it('should handle payment operations', () => {
      const { result } = renderHook(() => useTeamBookingDetail('booking-1'));
      
      result.current.updatePayment('payment-1', { amount: 1000000 });
      expect(mockStore.updatePayment).toHaveBeenCalledWith('booking-1', 'payment-1', { amount: 1000000 });
      
      result.current.deletePayment('payment-1');
      expect(mockStore.deletePayment).toHaveBeenCalledWith('booking-1', 'payment-1');
    });

    it('should handle status update', () => {
      const { result } = renderHook(() => useTeamBookingDetail('booking-1'));
      
      result.current.updateStatus('completed', 'Tour completed successfully');
      expect(mockStore.updateStatus).toHaveBeenCalledWith('booking-1', 'completed', 'Tour completed successfully');
    });
  });

  describe('useTeamBookingCalendar', () => {
    it('should fetch bookings for selected month', () => {
      renderHook(() => useTeamBookingCalendar());
      
      expect(mockStore.fetchBookings).toHaveBeenCalledWith({
        startDate: '2025-06-01',
        endDate: '2025-06-30',
        pageSize: 100
      });
    });

    it('should navigate to previous month', () => {
      const { result } = renderHook(() => useTeamBookingCalendar());
      
      act(() => {
        result.current.navigateMonth('prev');
      });
      
      expect(mockStore.setSelectedMonth).toHaveBeenCalledWith(2025, 5);
    });

    it('should navigate to next month', () => {
      const { result } = renderHook(() => useTeamBookingCalendar());
      
      act(() => {
        result.current.navigateMonth('next');
      });
      
      expect(mockStore.setSelectedMonth).toHaveBeenCalledWith(2025, 7);
    });

    it('should handle year boundary when navigating', () => {
      mockStore.selectedMonth = { year: 2025, month: 1 };
      const { result } = renderHook(() => useTeamBookingCalendar());
      
      act(() => {
        result.current.navigateMonth('prev');
      });
      
      expect(mockStore.setSelectedMonth).toHaveBeenCalledWith(2024, 12);
    });

    it('should go to today', () => {
      const today = new Date();
      const { result } = renderHook(() => useTeamBookingCalendar());
      
      act(() => {
        result.current.goToToday();
      });
      
      expect(mockStore.setSelectedMonth).toHaveBeenCalledWith(
        today.getFullYear(),
        today.getMonth() + 1
      );
    });
  });

  describe('useCreateTeamBooking', () => {
    it('should expose create booking functionality', () => {
      const { result } = renderHook(() => useCreateTeamBooking());
      
      expect(result.current.createBooking).toBe(mockStore.createBooking);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.clearError).toBe(mockStore.clearError);
    });
  });

  describe('useTeamBookingStats', () => {
    it('should calculate statistics from bookings', () => {
      const draftBooking = { ...mockBooking, id: '2', status: 'draft' as const };
      const cancelledBooking = { ...mockBooking, id: '3', status: 'cancelled' as const };
      
      mockStore.bookings = [mockBooking, draftBooking, cancelledBooking];
      mockStore.getBookingsByStatus = jest.fn((status) => 
        mockStore.bookings.filter(b => b.status === status)
      );
      
      const { result } = renderHook(() => useTeamBookingStats());
      
      expect(result.current.total).toBe(3);
      expect(result.current.confirmed).toBe(1);
      expect(result.current.draft).toBe(1);
      expect(result.current.cancelled).toBe(1);
      expect(result.current.inProgress).toBe(0);
      expect(result.current.completed).toBe(0);
      expect(result.current.totalParticipants).toBe(135); // 45 * 3
      expect(result.current.totalRevenue).toBe(267000000); // 89000000 * 3
    });
  });
});