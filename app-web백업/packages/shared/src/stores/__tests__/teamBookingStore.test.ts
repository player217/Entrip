import { renderHook, act } from '@testing-library/react';
import { useTeamBookingStore } from '../teamBookingStore';
import { teamBookingService } from '../../services/teamBookingService';
import type { 
  TeamBooking, 
  CreateTeamBookingPayload, 
  UpdateTeamBookingPayload,
  Transportation,
  Hotel,
  Participant
} from '../../types/team-booking';

// Mock the service
jest.mock('../../services/teamBookingService');

describe('useTeamBookingStore', () => {
  const mockBooking: TeamBooking = {
    id: '1',
    bookingNumber: 'TB-2024-001',
    teamCode: 'TC001',
    tourName: '삼성전자 연수팀',
    destination: '제주도',
    tourType: 'incentive',
    departureDate: '2024-02-01T09:00:00Z',
    returnDate: '2024-02-05T18:00:00Z',
    nights: 4,
    days: 5,
    transportation: {
      outbound: {
        flights: [{
          flightNumber: 'KE1234',
          airline: '대한항공',
          departureAirport: 'ICN',
          arrivalAirport: 'CJU',
          departureTime: '2024-02-01T09:00:00Z',
          arrivalTime: '2024-02-01T10:30:00Z',
          class: 'economy'
        }]
      },
      inbound: {
        flights: [{
          flightNumber: 'KE5678',
          airline: '대한항공',
          departureAirport: 'CJU',
          arrivalAirport: 'ICN',
          departureTime: '2024-02-05T18:00:00Z',
          arrivalTime: '2024-02-05T19:30:00Z',
          class: 'economy'
        }]
      }
    },
    accommodations: [{
      hotelName: '롯데호텔 제주',
      hotelAddress: '제주시 노형동',
      hotelPhone: '064-123-4567',
      checkInDate: '2024-02-01',
      checkOutDate: '2024-02-05',
      roomAllocations: [],
      mealPlan: 'breakfast' as const,
      totalRooms: 10
    }],
    participants: [],
    adultCount: 25,
    childCount: 0,
    infantCount: 0,
    totalCount: 25,
    costs: [],
    pricing: {
      adultPrice: 500000,
      childPrice: 400000,
      infantPrice: 0,
      currency: 'KRW'
    },
    settlement: {
      totalRevenue: 12500000,
      totalCost: 10000000,
      profit: 2500000,
      profitMargin: 20,
      payments: [],
      outstandingBalance: 9500000
    },
    customer: {
      organizationName: '삼성전자',
      organizationType: 'company' as const,
      contacts: [{
        name: '김담당',
        phone: '010-1234-5678',
        email: 'hr@samsung.com',
        relationship: 'primary' as const
      }],
      address: '경기도 수원시',
      taxId: '124-81-00998'
    },
    managers: [{
      id: 'm1',
      name: '김철수',
      email: 'kim@company.com',
      phone: '010-1234-5678',
      role: 'main' as const
    }],
    mainManagerId: 'm1',
    status: 'confirmed',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'admin',
    updatedAt: '2024-01-01T00:00:00Z',
    updatedBy: 'admin'
  };

  const mockCreatePayload: CreateTeamBookingPayload = {
    teamCode: 'TC002',
    tourName: 'LG전자 연수',
    destination: '부산',
    tourType: 'incentive' as const,
    departureDate: '2024-03-01',
    returnDate: '2024-03-05',
    customer: {
      organizationName: 'LG전자',
      organizationType: 'company' as const,
      contacts: [{
        name: '이담당',
        phone: '010-0000-0000',
        relationship: 'primary' as const
      }]
    },
    mainManagerId: 'm2'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useTeamBookingStore.setState({
      bookings: [],
      selectedBooking: null,
      filters: {
        page: 1,
        pageSize: 50,
        sortBy: 'departureDate',
        sortOrder: 'asc'
      },
      totalCount: 0,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      error: null,
      viewMode: 'list',
      selectedMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      },
      expandedBookingIds: new Set(),
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      expect(result.current.bookings).toEqual([]);
      expect(result.current.selectedBooking).toBeNull();
      expect(result.current.filters).toEqual({
        page: 1,
        pageSize: 50,
        sortBy: 'departureDate',
        sortOrder: 'asc'
      });
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.viewMode).toBe('list');
      expect(result.current.selectedMonth).toEqual({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });
      expect(result.current.expandedBookingIds).toEqual(new Set());
    });
  });

  describe('CRUD Operations', () => {
    describe('createBooking', () => {
      it('should create a new booking successfully', async () => {
        const newBooking = { ...mockBooking, id: '2' };
        (teamBookingService.createTeamBooking as jest.Mock).mockResolvedValue(newBooking);

        const { result } = renderHook(() => useTeamBookingStore());

        let createdBooking;
        await act(async () => {
          createdBooking = await result.current.createBooking(mockCreatePayload);
        });

        expect(teamBookingService.createTeamBooking).toHaveBeenCalledWith(mockCreatePayload);
        expect(result.current.bookings).toContainEqual(newBooking);
        expect(result.current.selectedBooking).toEqual(newBooking);
        expect(result.current.totalCount).toBe(1);
        expect(result.current.isCreating).toBe(false);
        expect(result.current.error).toBeNull();
        expect(createdBooking).toEqual(newBooking);
      });

      it('should handle create booking error', async () => {
        const error = new Error('생성 실패');
        (teamBookingService.createTeamBooking as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => useTeamBookingStore());

        await expect(
          result.current.createBooking(mockCreatePayload)
        ).rejects.toThrow('생성 실패');

        expect(result.current.error).toBe('생성 실패');
        expect(result.current.isCreating).toBe(false);
        expect(result.current.bookings).toEqual([]);
      });
    });

    describe('fetchBookings', () => {
      it('should fetch bookings successfully', async () => {
        const response = { bookings: [mockBooking], total: 1 };
        (teamBookingService.getTeamBookings as jest.Mock).mockResolvedValue(response);

        const { result } = renderHook(() => useTeamBookingStore());

        await act(async () => {
          await result.current.fetchBookings();
        });

        expect(teamBookingService.getTeamBookings).toHaveBeenCalledWith(result.current.filters);
        expect(result.current.bookings).toEqual([mockBooking]);
        expect(result.current.totalCount).toBe(1);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('should merge filters when fetching', async () => {
        const response = { bookings: [], total: 0 };
        (teamBookingService.getTeamBookings as jest.Mock).mockResolvedValue(response);

        const { result } = renderHook(() => useTeamBookingStore());
        const customFilters = { status: ['confirmed' as const] };

        await act(async () => {
          await result.current.fetchBookings(customFilters);
        });

        expect(teamBookingService.getTeamBookings).toHaveBeenCalledWith({
          ...result.current.filters,
          ...customFilters
        });
      });

      it('should handle fetch error', async () => {
        const error = new Error('네트워크 오류');
        (teamBookingService.getTeamBookings as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => useTeamBookingStore());

        await act(async () => {
          await result.current.fetchBookings();
        });

        expect(result.current.error).toBe('네트워크 오류');
        expect(result.current.isLoading).toBe(false);
      });
    });

    describe('fetchBookingDetail', () => {
      it('should fetch booking detail successfully', async () => {
        const response = { booking: { ...mockBooking, title: 'Updated' } };
        (teamBookingService.getTeamBookingDetail as jest.Mock).mockResolvedValue(response);

        const { result } = renderHook(() => useTeamBookingStore());

        // Set initial booking
        act(() => {
          result.current.bookings = [mockBooking];
        });

        await act(async () => {
          await result.current.fetchBookingDetail('1');
        });

        expect(teamBookingService.getTeamBookingDetail).toHaveBeenCalledWith('1');
        expect(result.current.selectedBooking).toEqual(response.booking);
        expect(result.current.bookings[0]).toEqual(response.booking);
      });
    });

    describe('updateBooking', () => {
      it('should update booking successfully', async () => {
        const updatePayload: UpdateTeamBookingPayload = { memo: '수정된 메모' };
        const updatedBooking = { ...mockBooking, memo: '수정된 메모' };
        (teamBookingService.updateTeamBooking as jest.Mock).mockResolvedValue(updatedBooking);

        const { result } = renderHook(() => useTeamBookingStore());

        // Set initial state
        act(() => {
          result.current.bookings = [mockBooking];
          result.current.selectedBooking = mockBooking;
        });

        await act(async () => {
          await result.current.updateBooking('1', updatePayload);
        });

        expect(teamBookingService.updateTeamBooking).toHaveBeenCalledWith('1', updatePayload);
        expect(result.current.bookings[0]).toEqual(updatedBooking);
        expect(result.current.selectedBooking).toEqual(updatedBooking);
        expect(result.current.isUpdating).toBe(false);
      });
    });

    describe('deleteBooking', () => {
      it('should delete booking successfully', async () => {
        (teamBookingService.deleteTeamBooking as jest.Mock).mockResolvedValue(undefined);

        const { result } = renderHook(() => useTeamBookingStore());

        // Set initial state
        act(() => {
          result.current.bookings = [mockBooking];
          result.current.selectedBooking = mockBooking;
          result.current.totalCount = 1;
        });

        await act(async () => {
          await result.current.deleteBooking('1');
        });

        expect(teamBookingService.deleteTeamBooking).toHaveBeenCalledWith('1');
        expect(result.current.bookings).toEqual([]);
        expect(result.current.selectedBooking).toBeNull();
        expect(result.current.totalCount).toBe(0);
      });
    });
  });

  describe('Specific Update Operations', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useTeamBookingStore());
      act(() => {
        result.current.bookings = [mockBooking];
        result.current.selectedBooking = mockBooking;
      });
    });

    it('should update transportation', async () => {
      const transportation: Transportation = {
        outbound: {
          buses: [{
            busCompany: '대한고속',
            busNumber: 'B123',
            departureLocation: '서울',
            arrivalLocation: '제주',
            departureTime: '2024-02-01T08:00:00Z',
            arrivalTime: '2024-02-01T12:00:00Z'
          }]
        },
        inbound: {
          buses: []
        }
      };
      const updatedBooking = { ...mockBooking, transportation };
      (teamBookingService.updateTransportation as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useTeamBookingStore());

      await act(async () => {
        await result.current.updateTransportation('1', transportation);
      });

      expect(teamBookingService.updateTransportation).toHaveBeenCalledWith('1', transportation);
      expect(result.current.isUpdating).toBe(false);
    });

    it('should update accommodations', async () => {
      const accommodations: Hotel[] = [{
        hotelName: '신라호텔',
        hotelAddress: '제주',
        hotelPhone: '064-999-9999',
        checkInDate: '2024-02-01',
        checkOutDate: '2024-02-05',
        roomAllocations: [],
        mealPlan: 'breakfast',
        totalRooms: 10
      }];
      const updatedBooking = { ...mockBooking, accommodations };
      (teamBookingService.updateAccommodations as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useTeamBookingStore());

      await act(async () => {
        await result.current.updateAccommodations('1', accommodations);
      });

      expect(teamBookingService.updateAccommodations).toHaveBeenCalledWith('1', accommodations);
    });

    it('should add participants', async () => {
      const participants: Participant[] = [{
        id: 'p1',
        name: '홍길동',
        gender: 'male',
        email: 'hong@email.com',
        phone: '010-1111-2222',
        roomAssignment: '101'
      }];
      const updatedBooking = { ...mockBooking, participants };
      (teamBookingService.addParticipants as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useTeamBookingStore());

      await act(async () => {
        await result.current.addParticipants('1', participants);
      });

      expect(teamBookingService.addParticipants).toHaveBeenCalledWith('1', participants);
    });

    it('should update status', async () => {
      const updatedBooking = { ...mockBooking, status: 'cancelled' as const };
      (teamBookingService.updateStatus as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useTeamBookingStore());

      await act(async () => {
        await result.current.updateStatus('1', 'cancelled', '고객 요청');
      });

      expect(teamBookingService.updateStatus).toHaveBeenCalledWith('1', 'cancelled', '고객 요청');
    });
  });

  describe('View Management', () => {
    it('should set filters and refetch', async () => {
      const response = { bookings: [], total: 0 };
      (teamBookingService.getTeamBookings as jest.Mock).mockResolvedValue(response);

      const { result } = renderHook(() => useTeamBookingStore());

      await act(async () => {
        result.current.setFilters({ page: 2 });
      });

      expect(result.current.filters.page).toBe(2);
      expect(teamBookingService.getTeamBookings).toHaveBeenCalled();
    });

    it('should set view mode', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      act(() => {
        result.current.setViewMode('calendar');
      });

      expect(result.current.viewMode).toBe('calendar');
    });

    it('should set selected month and fetch for calendar view', async () => {
      const response = { bookings: [], total: 0 };
      (teamBookingService.getTeamBookings as jest.Mock).mockResolvedValue(response);

      const { result } = renderHook(() => useTeamBookingStore());

      // Set to calendar view first
      act(() => {
        result.current.setViewMode('calendar');
      });

      await act(async () => {
        result.current.setSelectedMonth(2024, 2);
      });

      expect(result.current.selectedMonth).toEqual({ year: 2024, month: 2 });
      expect(teamBookingService.getTeamBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-02-01',
          endDate: '2024-02-29'
        })
      );
    });

    it('should toggle booking expanded state', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      act(() => {
        result.current.toggleBookingExpanded('1');
      });

      expect(result.current.expandedBookingIds.has('1')).toBe(true);

      act(() => {
        result.current.toggleBookingExpanded('1');
      });

      expect(result.current.expandedBookingIds.has('1')).toBe(false);
    });

    it('should select booking', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      act(() => {
        result.current.selectBooking(mockBooking);
      });

      expect(result.current.selectedBooking).toEqual(mockBooking);

      act(() => {
        result.current.selectBooking(null);
      });

      expect(result.current.selectedBooking).toBeNull();
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      act(() => {
        result.current.error = '테스트 에러';
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Computed Getters', () => {
    beforeEach(() => {
      const bookings = [
        mockBooking,
        {
          ...mockBooking,
          id: '2',
          departureDate: '2024-02-03T09:00:00Z',
          returnDate: '2024-02-03T18:00:00Z',
          status: 'draft' as const
        },
        {
          ...mockBooking,
          id: '3',
          status: 'cancelled' as const,
          managers: [{ id: 'm2', name: '이영희', email: 'lee@company.com', phone: '010-9999-8888', role: 'main' as const }]
        }
      ];

      const { result } = renderHook(() => useTeamBookingStore());
      act(() => {
        result.current.bookings = bookings;
      });
    });

    it('should get bookings by date', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      const bookingsOnDate = result.current.getBookingsByDate('2024-02-03');
      expect(bookingsOnDate).toHaveLength(3); // All three bookings span this date
    });

    it('should get bookings by status', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      const confirmedBookings = result.current.getBookingsByStatus('confirmed');
      expect(confirmedBookings).toHaveLength(1);

      const pendingBookings = result.current.getBookingsByStatus('draft');
      expect(pendingBookings).toHaveLength(1);

      const cancelledBookings = result.current.getBookingsByStatus('cancelled');
      expect(cancelledBookings).toHaveLength(1);
    });

    it('should get bookings by manager', () => {
      const { result } = renderHook(() => useTeamBookingStore());

      const managerBookings = result.current.getBookingsByManager('m1');
      expect(managerBookings).toHaveLength(2);

      const manager2Bookings = result.current.getBookingsByManager('m2');
      expect(manager2Bookings).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle generic errors', async () => {
      const genericError = 'Something went wrong';
      (teamBookingService.createTeamBooking as jest.Mock).mockRejectedValue(genericError);

      const { result } = renderHook(() => useTeamBookingStore());

      await expect(
        result.current.createBooking(mockCreatePayload)
      ).rejects.toBe(genericError);

      expect(result.current.error).toBe('예약 생성에 실패했습니다.');
    });

    it('should show loading states correctly', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      (teamBookingService.getTeamBookings as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useTeamBookingStore());

      // Start the fetch without awaiting
      act(() => {
        result.current.fetchBookings();
      });

      // Check loading state is true
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ bookings: [], total: 0 });
        await promise;
      });

      // Check loading state is false
      expect(result.current.isLoading).toBe(false);
    });
  });
});