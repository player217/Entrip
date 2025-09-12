import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Booking, NewTeamPayload, BookingFilters } from '../types/booking';
import { bookingService } from '../services/bookingService';

interface BookingState {
  // Data state
  bookings: Booking[];
  selectedMonth: { year: number; month: number };
  
  // Filter state
  filters: BookingFilters;
  
  // Modal state
  selectedBookingId: string | null;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Data actions
  setSelectedMonth: (year: number, month: number) => void;
  fetchMonthlyBookings: () => Promise<void>;
  addTeam: (payload: NewTeamPayload) => Promise<Booking>;
  updateBooking: (bookingId: string, payload: Partial<NewTeamPayload>) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  
  // Filter actions
  setFilters: (filters: Partial<BookingFilters>) => void;
  resetFilters: () => void;
  updateFilter: (key: keyof BookingFilters, value: any) => void;
  
  // Modal actions
  selectBooking: (id: string | null) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (id: string) => void;
  closeEditModal: () => void;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;
  closeAllModals: () => void;
  
  // UI state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const initialFilters: BookingFilters = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useBookingStore = create<BookingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      bookings: [],
      selectedMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      },
      filters: initialFilters,
      selectedBookingId: null,
      isCreateModalOpen: false,
      isEditModalOpen: false,
      isDeleteModalOpen: false,
      isLoading: false,
      error: null,

      // Data actions
      setSelectedMonth: (year, month) => {
        set({ selectedMonth: { year, month } });
        get().fetchMonthlyBookings();
      },

      fetchMonthlyBookings: async () => {
        set({ isLoading: true, error: null });
        try {
          const { year, month } = get().selectedMonth;
          const bookings = await bookingService.getMonthlyBookings(year, month);
          set({ bookings, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '예약 정보를 불러오는데 실패했습니다.',
            isLoading: false 
          });
        }
      },

      addTeam: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const newBooking = await bookingService.createBooking(payload);
          set(state => ({
            bookings: [...state.bookings, newBooking],
            isLoading: false
          }));
          return newBooking;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '예약 생성에 실패했습니다.',
            isLoading: false 
          });
          throw error;
        }
      },

      updateBooking: async (bookingId, payload) => {
        set({ isLoading: true, error: null });
        try {
          const updatedBooking = await bookingService.updateBooking(bookingId, payload);
          set(state => ({
            bookings: state.bookings.map(booking => 
              booking.id === bookingId ? updatedBooking : booking
            ),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '예약 수정에 실패했습니다.',
            isLoading: false 
          });
          throw error;
        }
      },

      deleteBooking: async (bookingId) => {
        set({ isLoading: true, error: null });
        try {
          await bookingService.deleteBooking(bookingId);
          set(state => ({
            bookings: state.bookings.filter(booking => booking.id !== bookingId),
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '예약 삭제에 실패했습니다.',
            isLoading: false 
          });
          throw error;
        }
      },
      
      // Filter actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters, page: 1 }, // Reset to first page when filters change
        }), false, 'setFilters'),
        
      resetFilters: () => 
        set({ filters: initialFilters }, false, 'resetFilters'),
        
      updateFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value, page: 1 }
        }), false, 'updateFilter'),
      
      // Modal actions
      selectBooking: (id) => 
        set({ selectedBookingId: id }, false, 'selectBooking'),
      
      openCreateModal: () => 
        set({ 
          isCreateModalOpen: true,
          selectedBookingId: null,
          error: null 
        }, false, 'openCreateModal'),
        
      closeCreateModal: () => 
        set({ 
          isCreateModalOpen: false,
          selectedBookingId: null,
          error: null 
        }, false, 'closeCreateModal'),
      
      openEditModal: (id) => 
        set({ 
          selectedBookingId: id, 
          isEditModalOpen: true,
          error: null 
        }, false, 'openEditModal'),
        
      closeEditModal: () => 
        set({ 
          selectedBookingId: null, 
          isEditModalOpen: false,
          error: null 
        }, false, 'closeEditModal'),
        
      openDeleteModal: (id) => 
        set({ 
          selectedBookingId: id, 
          isDeleteModalOpen: true,
          error: null 
        }, false, 'openDeleteModal'),
        
      closeDeleteModal: () => 
        set({ 
          selectedBookingId: null, 
          isDeleteModalOpen: false,
          error: null 
        }, false, 'closeDeleteModal'),
        
      closeAllModals: () => 
        set({ 
          isCreateModalOpen: false,
          isEditModalOpen: false,
          isDeleteModalOpen: false,
          selectedBookingId: null,
          error: null 
        }, false, 'closeAllModals'),
      
      // UI state actions
      setLoading: (loading) => 
        set({ isLoading: loading }, false, 'setLoading'),
        
      setError: (error) => 
        set({ error }, false, 'setError'),
        
      clearError: () => 
        set({ error: null }, false, 'clearError'),
    }),
    {
      name: 'booking-store',
      partialize: (state: BookingState) => ({
        filters: state.filters, // Only persist filters
      }),
    }
  )
);

// Selector hooks for better performance
export const useBookingFilters = () => useBookingStore((state) => state.filters);
export const useBookingModals = () => useBookingStore((state) => ({
  selectedBookingId: state.selectedBookingId,
  isCreateModalOpen: state.isCreateModalOpen,
  isEditModalOpen: state.isEditModalOpen,
  isDeleteModalOpen: state.isDeleteModalOpen,
}));
export const useBookingUI = () => useBookingStore((state) => ({
  isLoading: state.isLoading,
  error: state.error,
}));