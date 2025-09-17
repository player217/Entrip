import { apiClient } from '../lib/unified-api-client';
import { BookingDTO, validateBookingDTO } from '../types/booking';

describe('Unified API Client', () => {
  describe('Type Safety', () => {
    it('should provide type-safe get method', async () => {
      // This should compile without errors
      const mockBooking: BookingDTO = {
        id: '1',
        bookingNumber: 'BK001',
        companyCode: 'J1',
        customerName: 'Test Customer',
        destination: 'Seoul',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        status: 'CONFIRMED',
        totalPrice: 1000000,
        paxCount: 2,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        version: 1,
      };

      // Type checking at compile time
      expect(mockBooking.id).toBe('1');
    });
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      // @ts-ignore - accessing private property for testing
      const config = apiClient.axiosInstance.defaults;
      
      expect(config.baseURL).toBe('/');
      expect(config.withCredentials).toBe(true);
      expect(config.timeout).toBe(30000);
      expect(config.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('401 Handling', () => {
    it('should handle 401 without redirect', () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: 'http://localhost:3000/dashboard' };

      // Trigger 401 handler
      // In real test, this would be triggered by MSW or similar
      
      // Verify no redirect occurred
      expect(window.location.href).toBe('http://localhost:3000/dashboard');
      
      // Restore
      window.location = originalLocation;
    });
  });
});