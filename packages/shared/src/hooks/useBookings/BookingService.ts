/**
 * BookingService - Business logic layer for booking operations
 */

import type { 
  Booking, 
  BookingFilters,
  CreateBookingDto,
  UpdateBookingDto 
} from '../../types/booking';
import type { DataProvider } from './types';

export class BookingService {
  private provider: DataProvider<any>;
  private apiClient: any;
  
  constructor(provider: DataProvider<any>, apiClient: any) {
    this.provider = provider;
    this.apiClient = apiClient;
  }
  
  /**
   * Fetch bookings with filters
   */
  async getBookings(filters?: BookingFilters | { month?: string; take?: number }): Promise<{
    data: Booking[];
    pagination?: any;
  }> {
    const url = this.buildUrl(filters);
    return this.provider.fetch(url);
  }
  
  /**
   * Create a new booking
   */
  async createBooking(data: CreateBookingDto): Promise<Booking> {
    // Validation
    this.validateCreateBookingData(data);
    
    // API call
    const response = await this.apiClient.post('/api/bookings', data);
    
    // Cache invalidation
    await this.invalidateCache();
    
    return response.data;
  }
  
  /**
   * Update an existing booking
   */
  async updateBooking(id: string, data: UpdateBookingDto): Promise<Booking> {
    // Validation
    this.validateUpdateBookingData(data);
    
    // API call
    const response = await this.apiClient.put(`/api/bookings/${id}`, data);
    
    // Cache invalidation
    await this.invalidateCache();
    await this.provider.mutate(`/api/bookings/${id}`);
    
    return response.data;
  }
  
  /**
   * Delete a booking
   */
  async deleteBooking(id: string): Promise<void> {
    // API call
    await this.apiClient.delete(`/api/bookings/${id}`);
    
    // Cache invalidation
    await this.invalidateCache();
  }
  
  /**
   * Bulk delete bookings
   */
  async bulkDeleteBookings(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) {
      throw new Error('No booking IDs provided for bulk delete');
    }
    
    // API call
    const response = await this.apiClient.delete('/api/bookings/bulk', {
      data: { ids }
    });
    
    // Cache invalidation
    await this.invalidateCache();
    
    return response.data;
  }
  
  /**
   * Bulk restore bookings
   */
  async bulkRestoreBookings(bookings: any[]): Promise<{ restored: number }> {
    if (bookings.length === 0) {
      throw new Error('No bookings provided for bulk restore');
    }
    
    // API call
    const response = await this.apiClient.post('/api/bookings/bulk-restore', {
      bookings
    });
    
    // Cache invalidation
    await this.invalidateCache();
    
    return response.data;
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(filters?: BookingFilters | { month?: string; take?: number }): string {
    const params = new URLSearchParams();
    
    if (filters) {
      // Handle both old and new filter formats
      if ('month' in filters && filters.month) {
        params.append('month', filters.month);
        params.append('take', String(filters.take || 1000));
      } else {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
    }
    
    const queryString = params.toString();
    return queryString ? `/api/bookings?${queryString}` : '/api/bookings';
  }
  
  /**
   * Invalidate all booking-related caches
   */
  private async invalidateCache(): Promise<void> {
    // Invalidate all booking list caches
    await this.provider.mutate((key: any) => 
      typeof key === 'string' && key.startsWith('/api/bookings')
    );
  }
  
  /**
   * Validate create booking data
   */
  private validateCreateBookingData(data: CreateBookingDto): void {
    if (!data.customerName) {
      throw new Error('Customer name is required');
    }
    if (!data.teamName) {
      throw new Error('Team name is required');
    }
    if (!data.destination) {
      throw new Error('Destination is required');
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Start date and end date are required');
    }
    
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate >= endDate) {
      throw new Error('End date must be after start date');
    }
    
    // Validate numbers
    if (data.paxCount && data.paxCount < 1) {
      throw new Error('Pax count must be at least 1');
    }
    if (data.totalPrice && data.totalPrice < 0) {
      throw new Error('Total price cannot be negative');
    }
  }
  
  /**
   * Validate update booking data
   */
  private validateUpdateBookingData(data: UpdateBookingDto): void {
    // Similar to create but all fields are optional
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
    }
    
    if (data.paxCount !== undefined && data.paxCount < 1) {
      throw new Error('Pax count must be at least 1');
    }
    
    if (data.totalPrice !== undefined && data.totalPrice < 0) {
      throw new Error('Total price cannot be negative');
    }
  }
}