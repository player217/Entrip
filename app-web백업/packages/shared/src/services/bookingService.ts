import { apiClient } from '../lib/apiClient';
import type { NewTeamPayload, Booking, BookingListResponse, BookingDetailResponse } from '../types/booking';

export const bookingService = {
  // 신규 팀/예약 생성
  async createBooking(payload: NewTeamPayload): Promise<Booking> {
    const response = await apiClient.post<Booking>('/api/bookings', payload);
    return response.data;
  },

  // 예약 목록 조회
  async getBookings(params?: {
    page?: number;
    pageSize?: number;
    month?: string;
    status?: string;
  }): Promise<BookingListResponse> {
    const response = await apiClient.get<BookingListResponse>('/api/bookings', { params });
    return response.data;
  },

  // 예약 상세 조회
  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    const response = await apiClient.get<BookingDetailResponse>(`/api/bookings/${bookingId}`);
    return response.data;
  },

  // 예약 수정
  async updateBooking(bookingId: string, payload: Partial<NewTeamPayload>): Promise<Booking> {
    const response = await apiClient.put<Booking>(`/api/bookings/${bookingId}`, payload);
    return response.data;
  },

  // 예약 삭제
  async deleteBooking(bookingId: string): Promise<void> {
    await apiClient.delete(`/api/bookings/${bookingId}`);
  },

  // 월별 예약 조회 (캘린더용)
  async getMonthlyBookings(year: number, month: number): Promise<Booking[]> {
    const response = await apiClient.get<BookingListResponse>('/api/bookings/monthly', {
      params: { year, month }
    });
    return response.data.bookings;
  }
};