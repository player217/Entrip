import { BookingHelpers } from '../types/booking/helpers';
import { BookingDTO } from '../types/booking/dto';

describe('BookingHelpers', () => {
  const mockBooking: BookingDTO = {
    id: '1',
    bookingNumber: 'BK001',
    companyCode: 'J1',
    customerName: 'Test Customer',
    teamName: 'Test Team',
    destination: '일본 도쿄',
    startDate: '2025-01-01',
    endDate: '2025-01-05',
    status: 'CONFIRMED',
    totalPrice: 1000000,
    paxCount: 2,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    version: 1,
  };

  describe('canCancel', () => {
    it('should return true for CONFIRMED booking', () => {
      expect(BookingHelpers.canCancel(mockBooking)).toBe(true);
    });

    it('should return false for CANCELLED booking', () => {
      const cancelledBooking = { ...mockBooking, status: 'CANCELLED' as const };
      expect(BookingHelpers.canCancel(cancelledBooking)).toBe(false);
    });
  });

  describe('getDuration', () => {
    it('should calculate correct duration', () => {
      expect(BookingHelpers.getDuration(mockBooking)).toBe(4);
    });

    it('should return 1 for same day trip', () => {
      const sameDayBooking = { ...mockBooking, endDate: '2025-01-01' };
      expect(BookingHelpers.getDuration(sameDayBooking)).toBe(1);
    });

    it('should return 1 for booking without endDate', () => {
      const noEndDateBooking = { ...mockBooking, endDate: null };
      expect(BookingHelpers.getDuration(noEndDateBooking)).toBe(1);
    });
  });

  describe('getTypeCode', () => {
    it('should return IN for international destination', () => {
      expect(BookingHelpers.getTypeCode(mockBooking)).toBe('IN');
    });

    it('should return GF for golf destination', () => {
      const golfBooking = { ...mockBooking, destination: '제주 골프장' };
      expect(BookingHelpers.getTypeCode(golfBooking)).toBe('GF');
    });

    it('should return HM for honeymoon', () => {
      const honeymoonBooking = { ...mockBooking, destination: '몰디브 신혼여행' };
      expect(BookingHelpers.getTypeCode(honeymoonBooking)).toBe('HM');
    });

    it('should return AT for other destinations', () => {
      const domesticBooking = { ...mockBooking, destination: '부산' };
      expect(BookingHelpers.getTypeCode(domesticBooking)).toBe('AT');
    });
  });

  describe('toBookingEvent', () => {
    it('should convert BookingDTO to BookingEvent', () => {
      const event = BookingHelpers.toBookingEvent(mockBooking);
      
      expect(event).toMatchObject({
        id: '1',
        typeCode: 'IN',
        name: 'Test Team',
        customerName: 'Test Customer',
        status: 'CONFIRMED',
        paxCount: 2,
        date: '2025-01-01',
        totalPrice: 1000000,
      });
      
      expect(event.cost).toBeGreaterThan(0);
      expect(event.cost).toBeLessThan(1000000);
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const bookings: BookingDTO[] = [
        mockBooking,
        { ...mockBooking, id: '2', status: 'PENDING', totalPrice: 2000000, paxCount: 3 },
        { ...mockBooking, id: '3', status: 'CANCELLED', totalPrice: 500000, paxCount: 1 },
      ];

      const stats = BookingHelpers.calculateStats(bookings);
      
      expect(stats).toEqual({
        totalCount: 3,
        totalRevenue: 3500000,
        totalPax: 6,
        averagePrice: 1166667,
        statusCounts: {
          PENDING: 1,
          CONFIRMED: 1,
          CANCELLED: 1,
          COMPLETED: 0,
        },
      });
    });
  });

  describe('groupByMonth', () => {
    it('should group bookings by month', () => {
      const bookings: BookingDTO[] = [
        mockBooking,
        { ...mockBooking, id: '2', startDate: '2025-01-15' },
        { ...mockBooking, id: '3', startDate: '2025-02-01' },
      ];

      const grouped = BookingHelpers.groupByMonth(bookings);
      
      expect(Object.keys(grouped)).toEqual(['2025-01', '2025-02']);
      expect(grouped['2025-01']).toHaveLength(2);
      expect(grouped['2025-02']).toHaveLength(1);
    });
  });
});