import { renderHook, act } from '@testing-library/react';
import { useBookingStore } from '../bookingStore';
import { bookingService } from '../../services/bookingService';
import type { Booking, NewTeamPayload } from '../../types/booking';

// Mock the service
jest.mock('../../services/bookingService');

describe('useBookingStore', () => {
  const mockBooking: Booking = {
    id: '1',
    bookingNumber: 'BK2024021500001',
    teamCode: 'TC001',
    teamName: '테스트팀',
    departureDate: '2024-02-15',
    returnDate: '2024-02-20',
    destination: '방콕',
    nights: 5,
    days: 6,
    productType: '패키지',
    airline: '대한항공',
    hotel: '방콕호텔',
    roomType: '트윈',
    mealType: '조식포함',
    adultCount: 15,
    childCount: 3,
    infantCount: 2,
    totalCount: 20,
    adultPrice: 1500000,
    childPrice: 1200000,
    totalPrice: 26100000,
    deposit: 5000000,
    balance: 21100000,
    customerName: '김고객',
    customerPhone: '010-1234-5678',
    customerEmail: 'customer@example.com',
    customerCompany: '테스트회사',
    managerId: 'MGR001',
    managerName: '김매니저',
    status: 'CONFIRMED',
    memo: '테스트 예약',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockNewTeamPayload: NewTeamPayload = {
    teamCode: 'TC002',
    teamName: '신규팀',
    departureDate: '2024-02-20',
    returnDate: '2024-02-25',
    destination: '도쿄',
    nights: 5,
    days: 6,
    productType: '패키지',
    airline: '아시아나',
    hotel: '도쿄호텔',
    roomType: '더블',
    mealType: '조식포함',
    adultCount: 10,
    childCount: 2,
    infantCount: 1,
    totalCount: 13,
    adultPrice: 1800000,
    childPrice: 1500000,
    totalPrice: 21000000,
    deposit: 4000000,
    balance: 17000000,
    customerName: '이고객',
    customerPhone: '010-9876-5432',
    customerEmail: 'customer2@example.com',
    managerId: 'MGR002',
    managerName: '박매니저',
    status: 'PENDING'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Zustand store state
    useBookingStore.setState({
      bookings: [],
      error: null,
      isLoading: false,
      selectedMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useBookingStore());

      expect(result.current.bookings).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.selectedMonth).toEqual({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      });
    });
  });

  describe('Month Selection', () => {
    it('should set selected month and fetch bookings', async () => {
      (bookingService.getMonthlyBookings as jest.Mock).mockResolvedValue([mockBooking]);

      const { result } = renderHook(() => useBookingStore());

      await act(async () => {
        result.current.setSelectedMonth(2024, 2);
      });

      expect(result.current.selectedMonth).toEqual({ year: 2024, month: 2 });
      expect(bookingService.getMonthlyBookings).toHaveBeenCalledWith(2024, 2);
      expect(result.current.bookings).toEqual([mockBooking]);
    });
  });

  describe('Fetch Monthly Bookings', () => {
    it('should fetch bookings successfully', async () => {
      (bookingService.getMonthlyBookings as jest.Mock).mockResolvedValue([mockBooking]);

      const { result } = renderHook(() => useBookingStore());

      await act(async () => {
        await result.current.fetchMonthlyBookings();
      });

      const { year, month } = result.current.selectedMonth;
      expect(bookingService.getMonthlyBookings).toHaveBeenCalledWith(year, month);
      expect(result.current.bookings).toEqual([mockBooking]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const error = new Error('네트워크 오류');
      (bookingService.getMonthlyBookings as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useBookingStore());

      await act(async () => {
        await result.current.fetchMonthlyBookings();
      });

      expect(result.current.error).toBe('네트워크 오류');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.bookings).toEqual([]);
    });

    it('should handle generic fetch error', async () => {
      (bookingService.getMonthlyBookings as jest.Mock).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useBookingStore());

      await act(async () => {
        await result.current.fetchMonthlyBookings();
      });

      expect(result.current.error).toBe('예약 정보를 불러오는데 실패했습니다.');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Add Team', () => {
    it('should add a new team successfully', async () => {
      const newBooking = { ...mockBooking, id: '2' };
      (bookingService.createBooking as jest.Mock).mockResolvedValue(newBooking);

      const { result } = renderHook(() => useBookingStore());

      // Set initial booking
      act(() => {
        result.current.bookings = [mockBooking];
      });

      let createdBooking;
      await act(async () => {
        createdBooking = await result.current.addTeam(mockNewTeamPayload);
      });

      expect(bookingService.createBooking).toHaveBeenCalledWith(mockNewTeamPayload);
      expect(result.current.bookings).toHaveLength(2);
      expect(result.current.bookings).toContainEqual(newBooking);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(createdBooking).toEqual(newBooking);
    });

    it('should handle add team error', async () => {
      const error = new Error('생성 실패');
      (bookingService.createBooking as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useBookingStore());

      // Call the method and expect it to throw
      await expect(
        result.current.addTeam(mockNewTeamPayload)
      ).rejects.toThrow('생성 실패');

      // Check the error state was set
      expect(result.current.error).toBe('생성 실패');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.bookings).toEqual([]);
    });

    it('should handle generic add team error', async () => {
      (bookingService.createBooking as jest.Mock).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useBookingStore());

      // Call the method and expect it to throw
      await expect(
        result.current.addTeam(mockNewTeamPayload)
      ).rejects.toBe('Unknown error');

      // Check the error state was set
      expect(result.current.error).toBe('예약 생성에 실패했습니다.');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Update Booking', () => {
    it('should update booking successfully', async () => {
      const updatePayload: Partial<NewTeamPayload> = { teamName: '업데이트팀' };
      const updatedBooking = { ...mockBooking, teamName: '업데이트팀' };
      (bookingService.updateBooking as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useBookingStore());

      // Set initial bookings
      act(() => {
        result.current.bookings = [mockBooking];
      });

      await act(async () => {
        await result.current.updateBooking('1', updatePayload);
      });

      expect(bookingService.updateBooking).toHaveBeenCalledWith('1', updatePayload);
      expect(result.current.bookings[0]).toEqual(updatedBooking);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle update error', async () => {
      const error = new Error('수정 실패');
      (bookingService.updateBooking as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.bookings = [mockBooking];
      });

      // Call the method and expect it to throw
      await expect(
        result.current.updateBooking('1', { teamName: '실패' })
      ).rejects.toThrow('수정 실패');

      // Check the error state was set
      expect(result.current.error).toBe('수정 실패');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.bookings[0]).toEqual(mockBooking); // Should remain unchanged
    });

    it('should not affect other bookings when updating', async () => {
      const booking2 = { ...mockBooking, id: '2', name: '다른팀' };
      const updatedBooking = { ...mockBooking, name: '업데이트됨' };
      (bookingService.updateBooking as jest.Mock).mockResolvedValue(updatedBooking);

      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.bookings = [mockBooking, booking2];
      });

      await act(async () => {
        await result.current.updateBooking('1', { teamName: '업데이트됨' });
      });

      expect(result.current.bookings).toHaveLength(2);
      expect(result.current.bookings[0]).toEqual(updatedBooking);
      expect(result.current.bookings[1]).toEqual(booking2); // Should remain unchanged
    });
  });

  describe('Delete Booking', () => {
    it('should delete booking successfully', async () => {
      (bookingService.deleteBooking as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBookingStore());

      // Set initial bookings
      const booking2 = { ...mockBooking, id: '2' };
      act(() => {
        result.current.bookings = [mockBooking, booking2];
      });

      await act(async () => {
        await result.current.deleteBooking('1');
      });

      expect(bookingService.deleteBooking).toHaveBeenCalledWith('1');
      expect(result.current.bookings).toHaveLength(1);
      expect(result.current.bookings[0]).toEqual(booking2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle delete error', async () => {
      const error = new Error('삭제 실패');
      (bookingService.deleteBooking as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useBookingStore());

      act(() => {
        result.current.bookings = [mockBooking];
      });

      // Call the method and expect it to throw
      await expect(
        result.current.deleteBooking('1')
      ).rejects.toThrow('삭제 실패');

      // Check the error state was set
      expect(result.current.error).toBe('삭제 실패');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.bookings).toHaveLength(1); // Should remain unchanged
    });

    it('should handle generic delete error', async () => {
      (bookingService.deleteBooking as jest.Mock).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useBookingStore());

      // Call the method and expect it to throw
      await expect(
        result.current.deleteBooking('1')
      ).rejects.toBe('Unknown error');

      // Check the error state was set
      expect(result.current.error).toBe('예약 삭제에 실패했습니다.');
    });
  });

  describe('Error Management', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useBookingStore());

      // Set an error
      act(() => {
        result.current.error = '테스트 에러';
      });

      expect(result.current.error).toBe('테스트 에러');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should set loading state during operations', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      (bookingService.getMonthlyBookings as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useBookingStore());

      // Start fetching without awaiting
      act(() => {
        result.current.fetchMonthlyBookings();
      });

      // Check loading state immediately
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise and wait for the state update
      await act(async () => {
        resolvePromise!([mockBooking]);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state to false on error', async () => {
      (bookingService.getMonthlyBookings as jest.Mock).mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useBookingStore());

      await act(async () => {
        await result.current.fetchMonthlyBookings();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});