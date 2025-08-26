import { bookingService } from '../bookingService';
import { apiClient } from '../../lib/apiClient';
import type { NewTeamPayload, Booking, BookingListResponse, BookingDetailResponse } from '../../types/booking';

// Mock the API client
jest.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('bookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBookings', () => {
    it('should fetch bookings list', async () => {
      const mockBookings: Booking[] = [
        {
          id: '1',
          bookingNumber: 'BK-2024-001',
          teamCode: 'T-001',
          teamName: 'Team 1',
          departureDate: '2024-03-01',
          returnDate: '2024-03-05',
          destination: 'Seoul',
          nights: 4,
          days: 5,
          productType: 'package',
          airline: 'Korean Air',
          hotel: 'Lotte Hotel',
          roomType: 'double',
          mealType: 'breakfast',
          adultCount: 10,
          childCount: 2,
          infantCount: 0,
          totalCount: 12,
          adultPrice: 1000000,
          childPrice: 700000,
          totalPrice: 11400000,
          deposit: 5000000,
          balance: 6400000,
          customerName: '김고객',
          customerPhone: '010-1111-2222',
          customerEmail: 'kim@example.com',
          managerId: 'manager-1',
          managerName: '박매니저',
          status: 'CONFIRMED',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          bookingNumber: 'BK-2024-002',
          teamCode: 'T-002',
          teamName: 'Team 2',
          departureDate: '2024-04-01',
          returnDate: '2024-04-07',
          destination: 'Jeju',
          nights: 6,
          days: 7,
          productType: 'package',
          airline: 'Asiana',
          hotel: 'Shilla Hotel',
          roomType: 'twin',
          mealType: 'half_board',
          adultCount: 15,
          childCount: 3,
          infantCount: 1,
          totalCount: 19,
          adultPrice: 1200000,
          childPrice: 800000,
          totalPrice: 20400000,
          deposit: 10000000,
          balance: 10400000,
          customerName: '이고객',
          customerPhone: '010-3333-4444',
          customerEmail: 'lee@example.com',
          managerId: 'manager-2',
          managerName: '최매니저',
          status: 'PENDING',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ];

      const mockResponse: BookingListResponse = {
        bookings: mockBookings,
        total: 2,
        page: 1,
        pageSize: 20
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await bookingService.getBookings();

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Network error';
      (apiClient.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(bookingService.getBookings()).rejects.toThrow(errorMessage);
    });

    it('should pass query parameters', async () => {
      const params = { page: 2, pageSize: 20, status: 'confirmed' };
      const mockResponse: BookingListResponse = {
        bookings: [],
        total: 0,
        page: 2,
        pageSize: 20
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      await bookingService.getBookings(params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings', { params });
    });
  });

  describe('getBooking', () => {
    it('should fetch single booking by ID', async () => {
      const mockBooking: Booking = {
        id: '123',
        bookingNumber: 'BK-2024-123',
        teamCode: 'T-123',
        teamName: 'Test Team',
        departureDate: '2024-05-01',
        returnDate: '2024-05-10',
        destination: 'Busan',
        nights: 9,
        days: 10,
        productType: 'custom',
        airline: 'Jin Air',
        hotel: 'Paradise Hotel',
        roomType: 'suite',
        mealType: 'full_board',
        adultCount: 20,
        childCount: 5,
        infantCount: 2,
        totalCount: 27,
        adultPrice: 2000000,
        childPrice: 1200000,
        totalPrice: 46000000,
        deposit: 20000000,
        balance: 26000000,
        customerName: '박고객',
        customerPhone: '010-5555-6666',
        customerEmail: 'park@example.com',
        customerCompany: 'Samsung',
        managerId: 'manager-3',
        managerName: '정매니저',
        status: 'CONFIRMED',
        memo: 'VIP 고객',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-15T00:00:00Z'
      };

      const mockResponse: BookingDetailResponse = {
        booking: mockBooking,
        events: []
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await bookingService.getBookingDetail('123');

      expect(apiClient.get).toHaveBeenCalledWith('/api/bookings/123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Not found'));

      await expect(bookingService.getBookingDetail('999')).rejects.toThrow('Not found');
    });
  });

  describe('createBooking', () => {
    it('should create a new booking', async () => {
      const newBooking: NewTeamPayload = {
        // 일정 정보
        teamCode: 'T-001',
        teamName: 'DevTeam',
        departureDate: '2024-08-01',
        returnDate: '2024-08-05',
        destination: 'Jeju',
        nights: 4,
        days: 5,
        
        // 상품 정보
        productType: 'package',
        airline: 'Korean Air',
        hotel: 'Shilla Hotel',
        roomType: 'double',
        mealType: 'breakfast',
        
        // 인원 정보
        adultCount: 18,
        childCount: 2,
        infantCount: 0,
        totalCount: 20,
        
        // 금액 정보
        adultPrice: 1500000,
        childPrice: 1000000,
        totalPrice: 29000000,
        deposit: 10000000,
        balance: 19000000,
        
        // 고객 정보
        customerName: 'John Doe',
        customerPhone: '010-1234-5678',
        customerEmail: 'john@example.com',
        customerCompany: 'ABC Company',
        
        // 담당자 정보
        managerId: 'manager-1',
        managerName: '김매니저',
        
        // 상태 및 메모
        status: 'PENDING',
        memo: 'First booking'
      };

      const createdBooking: Booking = {
        id: '456',
        bookingNumber: 'BK-2024-001',
        ...newBooking,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: createdBooking });

      const result = await bookingService.createBooking(newBooking);

      expect(apiClient.post).toHaveBeenCalledWith('/api/bookings', newBooking);
      expect(result).toEqual(createdBooking);
    });

    it('should handle validation errors', async () => {
      const invalidBooking = {} as any;
      const validationError = new Error('Validation failed');
      
      (apiClient.post as jest.Mock).mockRejectedValue(validationError);

      await expect(bookingService.createBooking(invalidBooking)).rejects.toThrow('Validation failed');
    });
  });

  describe('updateBooking', () => {
    it('should update an existing booking', async () => {
      const bookingId = '123';
      const updates: Partial<NewTeamPayload> = {
        status: 'CONFIRMED',
        memo: 'VIP guest',
        customerEmail: 'updated@example.com'
      };

      const updatedBooking: Booking = {
        id: bookingId,
        bookingNumber: 'BK-2024-123',
        teamCode: 'T-123',
        teamName: 'Test Team',
        departureDate: '2024-05-01',
        returnDate: '2024-05-10',
        destination: 'Busan',
        nights: 9,
        days: 10,
        productType: 'custom',
        airline: 'Jin Air',
        hotel: 'Paradise Hotel',
        roomType: 'suite',
        mealType: 'full_board',
        adultCount: 20,
        childCount: 5,
        infantCount: 2,
        totalCount: 27,
        adultPrice: 2000000,
        childPrice: 1200000,
        totalPrice: 46000000,
        deposit: 20000000,
        balance: 26000000,
        customerName: '박고객',
        customerPhone: '010-5555-6666',
        customerEmail: 'updated@example.com',
        customerCompany: 'Samsung',
        managerId: 'manager-3',
        managerName: '정매니저',
        status: 'CONFIRMED',
        memo: 'VIP guest',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-03-01T00:00:00Z'
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: updatedBooking });

      const result = await bookingService.updateBooking(bookingId, updates);

      expect(apiClient.put).toHaveBeenCalledWith(`/api/bookings/${bookingId}`, updates);
      expect(result).toEqual(updatedBooking);
    });

    it('should handle concurrent update conflicts', async () => {
      const bookingId = '123';
      const updates = { status: 'CONFIRMED' as const };
      
      (apiClient.put as jest.Mock).mockRejectedValue(new Error('Conflict: Booking was modified'));

      await expect(bookingService.updateBooking(bookingId, updates))
        .rejects.toThrow('Conflict: Booking was modified');
    });
  });

  describe('deleteBooking', () => {
    it('should delete a booking', async () => {
      const bookingId = '123';
      
      (apiClient.delete as jest.Mock).mockResolvedValue({ success: true });

      await bookingService.deleteBooking(bookingId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/api/bookings/${bookingId}`);
    });

    it('should handle delete restrictions', async () => {
      const bookingId = '123';
      
      (apiClient.delete as jest.Mock).mockRejectedValue(
        new Error('Cannot delete confirmed booking')
      );

      await expect(bookingService.deleteBooking(bookingId))
        .rejects.toThrow('Cannot delete confirmed booking');
    });
  });

});