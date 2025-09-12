import { apiClient } from '../lib/apiClient';
import type {
  TeamBooking,
  CreateTeamBookingPayload,
  UpdateTeamBookingPayload,
  TeamBookingListResponse,
  TeamBookingDetailResponse,
  TeamBookingFilters,
  Transportation,
  Hotel,
  Participant,
  Cost,
  Payment,
  Manager
} from '../types/team-booking';

export const teamBookingService = {
  // Create new team booking
  async createTeamBooking(payload: CreateTeamBookingPayload): Promise<TeamBooking> {
    const response = await apiClient.post<TeamBooking>('/api/team-bookings', payload);
    return response.data;
  },

  // Get team bookings with filters
  async getTeamBookings(filters?: TeamBookingFilters): Promise<TeamBookingListResponse> {
    const response = await apiClient.get<TeamBookingListResponse>('/api/team-bookings', {
      params: filters
    });
    return response.data;
  },

  // Get single team booking detail
  async getTeamBookingDetail(bookingId: string): Promise<TeamBookingDetailResponse> {
    const response = await apiClient.get<TeamBookingDetailResponse>(
      `/api/team-bookings/${bookingId}`
    );
    return response.data;
  },

  // Update team booking
  async updateTeamBooking(
    bookingId: string,
    payload: UpdateTeamBookingPayload
  ): Promise<TeamBooking> {
    const response = await apiClient.patch<TeamBooking>(
      `/api/team-bookings/${bookingId}`,
      payload
    );
    return response.data;
  },

  // Delete team booking
  async deleteTeamBooking(bookingId: string): Promise<void> {
    await apiClient.delete(`/api/team-bookings/${bookingId}`);
  },

  // Transportation management
  async updateTransportation(
    bookingId: string,
    transportation: Transportation
  ): Promise<TeamBooking> {
    const response = await apiClient.put<TeamBooking>(
      `/api/team-bookings/${bookingId}/transportation`,
      transportation
    );
    return response.data;
  },

  // Accommodation management
  async updateAccommodations(
    bookingId: string,
    accommodations: Hotel[]
  ): Promise<TeamBooking> {
    const response = await apiClient.put<TeamBooking>(
      `/api/team-bookings/${bookingId}/accommodations`,
      { accommodations }
    );
    return response.data;
  },

  // Participant management
  async addParticipants(
    bookingId: string,
    participants: Participant[]
  ): Promise<TeamBooking> {
    const response = await apiClient.post<TeamBooking>(
      `/api/team-bookings/${bookingId}/participants`,
      { participants }
    );
    return response.data;
  },

  async updateParticipant(
    bookingId: string,
    participantId: string,
    data: Partial<Participant>
  ): Promise<TeamBooking> {
    const response = await apiClient.patch<TeamBooking>(
      `/api/team-bookings/${bookingId}/participants/${participantId}`,
      data
    );
    return response.data;
  },

  async removeParticipant(
    bookingId: string,
    participantId: string
  ): Promise<TeamBooking> {
    const response = await apiClient.delete<TeamBooking>(
      `/api/team-bookings/${bookingId}/participants/${participantId}`
    );
    return response.data;
  },

  // Financial management
  async updateCosts(bookingId: string, costs: Cost[]): Promise<TeamBooking> {
    const response = await apiClient.put<TeamBooking>(
      `/api/team-bookings/${bookingId}/costs`,
      { costs }
    );
    return response.data;
  },

  async addPayment(bookingId: string, payment: Omit<Payment, 'id'>): Promise<TeamBooking> {
    const response = await apiClient.post<TeamBooking>(
      `/api/team-bookings/${bookingId}/payments`,
      payment
    );
    return response.data;
  },

  async updatePayment(
    bookingId: string,
    paymentId: string,
    data: Partial<Payment>
  ): Promise<TeamBooking> {
    const response = await apiClient.patch<TeamBooking>(
      `/api/team-bookings/${bookingId}/payments/${paymentId}`,
      data
    );
    return response.data;
  },

  async deletePayment(bookingId: string, paymentId: string): Promise<TeamBooking> {
    const response = await apiClient.delete<TeamBooking>(
      `/api/team-bookings/${bookingId}/payments/${paymentId}`
    );
    return response.data;
  },

  // Manager assignment
  async assignManagers(bookingId: string, managers: Manager[]): Promise<TeamBooking> {
    const response = await apiClient.put<TeamBooking>(
      `/api/team-bookings/${bookingId}/managers`,
      { managers }
    );
    return response.data;
  },

  // Status management
  async updateStatus(
    bookingId: string,
    status: TeamBooking['status'],
    reason?: string
  ): Promise<TeamBooking> {
    const response = await apiClient.patch<TeamBooking>(
      `/api/team-bookings/${bookingId}/status`,
      { status, reason }
    );
    return response.data;
  },

  // File attachment management
  async uploadAttachment(
    bookingId: string,
    file: File,
    category: string
  ): Promise<TeamBooking> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await apiClient.post<TeamBooking>(
      `/api/team-bookings/${bookingId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  },

  async deleteAttachment(
    bookingId: string,
    attachmentId: string
  ): Promise<TeamBooking> {
    const response = await apiClient.delete<TeamBooking>(
      `/api/team-bookings/${bookingId}/attachments/${attachmentId}`
    );
    return response.data;
  },

  // Bulk operations
  async bulkUpdateStatus(
    bookingIds: string[],
    status: TeamBooking['status']
  ): Promise<{ updated: number; failed: string[] }> {
    const response = await apiClient.post<{ updated: number; failed: string[] }>(
      '/api/team-bookings/bulk/status',
      { bookingIds, status }
    );
    return response.data;
  },

  // Export operations
  async exportBookings(filters?: TeamBookingFilters): Promise<Blob> {
    const response = await apiClient.get('/api/team-bookings/export', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  // Calendar view helpers
  async getMonthlyBookings(year: number, month: number): Promise<TeamBooking[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    const response = await this.getTeamBookings({
      startDate,
      endDate,
      pageSize: 100
    });
    
    return response.bookings;
  },

  // Statistics
  async getBookingStatistics(filters?: {
    startDate?: string;
    endDate?: string;
    managerId?: string;
  }): Promise<{
    totalBookings: number;
    totalRevenue: number;
    totalParticipants: number;
    byStatus: Record<string, number>;
    byDestination: Record<string, number>;
    byMonth: Array<{ month: string; count: number; revenue: number }>;
  }> {
    const response = await apiClient.get('/api/team-bookings/statistics', {
      params: filters
    });
    return response.data;
  }
};