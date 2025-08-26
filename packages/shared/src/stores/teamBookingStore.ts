import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  TeamBooking,
  CreateTeamBookingPayload,
  UpdateTeamBookingPayload,
  TeamBookingFilters,
  Transportation,
  Hotel,
  Participant,
  Cost,
  Payment,
  Manager
} from '../types/team-booking';
import { teamBookingService } from '../services/teamBookingService';

interface TeamBookingState {
  // State
  bookings: TeamBooking[];
  selectedBooking: TeamBooking | null;
  filters: TeamBookingFilters;
  totalCount: number;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // View state
  viewMode: 'list' | 'calendar' | 'kanban';
  selectedMonth: { year: number; month: number };
  expandedBookingIds: Set<string>;
  
  // Actions - CRUD
  createBooking: (payload: CreateTeamBookingPayload) => Promise<TeamBooking>;
  fetchBookings: (filters?: TeamBookingFilters) => Promise<void>;
  fetchBookingDetail: (bookingId: string) => Promise<void>;
  updateBooking: (bookingId: string, payload: UpdateTeamBookingPayload) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  
  // Actions - Specific updates
  updateTransportation: (bookingId: string, transportation: Transportation) => Promise<void>;
  updateAccommodations: (bookingId: string, accommodations: Hotel[]) => Promise<void>;
  addParticipants: (bookingId: string, participants: Participant[]) => Promise<void>;
  updateParticipant: (bookingId: string, participantId: string, data: Partial<Participant>) => Promise<void>;
  removeParticipant: (bookingId: string, participantId: string) => Promise<void>;
  updateCosts: (bookingId: string, costs: Cost[]) => Promise<void>;
  addPayment: (bookingId: string, payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (bookingId: string, paymentId: string, data: Partial<Payment>) => Promise<void>;
  deletePayment: (bookingId: string, paymentId: string) => Promise<void>;
  assignManagers: (bookingId: string, managers: Manager[]) => Promise<void>;
  updateStatus: (bookingId: string, status: TeamBooking['status'], reason?: string) => Promise<void>;
  
  // Actions - View management
  setFilters: (filters: TeamBookingFilters) => void;
  setViewMode: (mode: 'list' | 'calendar' | 'kanban') => void;
  setSelectedMonth: (year: number, month: number) => void;
  toggleBookingExpanded: (bookingId: string) => void;
  selectBooking: (booking: TeamBooking | null) => void;
  clearError: () => void;
  
  // Computed getters
  getBookingsByDate: (date: string) => TeamBooking[];
  getBookingsByStatus: (status: TeamBooking['status']) => TeamBooking[];
  getBookingsByManager: (managerId: string) => TeamBooking[];
}

export const useTeamBookingStore = create<TeamBookingState>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        // Initial state
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

        // Create booking
        createBooking: async (payload) => {
          set({ isCreating: true, error: null });
          try {
            const newBooking = await teamBookingService.createTeamBooking(payload);
            set(state => ({
              bookings: [newBooking, ...state.bookings],
              totalCount: state.totalCount + 1,
              isCreating: false,
              selectedBooking: newBooking
            }));
            return newBooking;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '예약 생성에 실패했습니다.',
              isCreating: false
            });
            throw error;
          }
        },

        // Fetch bookings
        fetchBookings: async (filters) => {
          set({ isLoading: true, error: null });
          try {
            const mergedFilters = { ...get().filters, ...filters };
            const response = await teamBookingService.getTeamBookings(mergedFilters);
            set({
              bookings: response.bookings,
              totalCount: response.total,
              filters: mergedFilters,
              isLoading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '예약 목록을 불러오는데 실패했습니다.',
              isLoading: false
            });
          }
        },

        // Fetch booking detail
        fetchBookingDetail: async (bookingId) => {
          set({ isLoading: true, error: null });
          try {
            const response = await teamBookingService.getTeamBookingDetail(bookingId);
            set(state => ({
              selectedBooking: response.booking,
              bookings: state.bookings.map(b => 
                b.id === bookingId ? response.booking : b
              ),
              isLoading: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '예약 상세정보를 불러오는데 실패했습니다.',
              isLoading: false
            });
          }
        },

        // Update booking
        updateBooking: async (bookingId, payload) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateTeamBooking(bookingId, payload);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '예약 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Delete booking
        deleteBooking: async (bookingId) => {
          set({ isLoading: true, error: null });
          try {
            await teamBookingService.deleteTeamBooking(bookingId);
            set(state => ({
              bookings: state.bookings.filter(b => b.id !== bookingId),
              totalCount: state.totalCount - 1,
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? null 
                : state.selectedBooking,
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

        // Transportation management
        updateTransportation: async (bookingId, transportation) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateTransportation(bookingId, transportation);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '교통편 정보 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Accommodation management
        updateAccommodations: async (bookingId, accommodations) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateAccommodations(bookingId, accommodations);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '숙박 정보 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Participant management
        addParticipants: async (bookingId, participants) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.addParticipants(bookingId, participants);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '참가자 추가에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        updateParticipant: async (bookingId, participantId, data) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateParticipant(bookingId, participantId, data);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '참가자 정보 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        removeParticipant: async (bookingId, participantId) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.removeParticipant(bookingId, participantId);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '참가자 삭제에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Financial management
        updateCosts: async (bookingId, costs) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateCosts(bookingId, costs);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '비용 정보 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        addPayment: async (bookingId, payment) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.addPayment(bookingId, payment);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '결제 정보 추가에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        updatePayment: async (bookingId, paymentId, data) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updatePayment(bookingId, paymentId, data);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '결제 정보 수정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        deletePayment: async (bookingId, paymentId) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.deletePayment(bookingId, paymentId);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '결제 정보 삭제에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Manager assignment
        assignManagers: async (bookingId, managers) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.assignManagers(bookingId, managers);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '담당자 배정에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // Status management
        updateStatus: async (bookingId, status, reason) => {
          set({ isUpdating: true, error: null });
          try {
            const updatedBooking = await teamBookingService.updateStatus(bookingId, status, reason);
            set(state => ({
              bookings: state.bookings.map(b => 
                b.id === bookingId ? updatedBooking : b
              ),
              selectedBooking: state.selectedBooking?.id === bookingId 
                ? updatedBooking 
                : state.selectedBooking,
              isUpdating: false
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
              isUpdating: false
            });
            throw error;
          }
        },

        // View management
        setFilters: (filters) => {
          set(state => ({
            filters: { ...state.filters, ...filters }
          }));
          get().fetchBookings();
        },

        setViewMode: (mode) => set({ viewMode: mode }),

        setSelectedMonth: (year, month) => {
          set({ selectedMonth: { year, month } });
          if (get().viewMode === 'calendar') {
            // Create dates in local timezone to avoid UTC offset issues
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            
            get().fetchBookings({
              startDate,
              endDate
            });
          }
        },

        toggleBookingExpanded: (bookingId) => {
          set(state => {
            const newExpanded = new Set(state.expandedBookingIds);
            if (newExpanded.has(bookingId)) {
              newExpanded.delete(bookingId);
            } else {
              newExpanded.add(bookingId);
            }
            return { expandedBookingIds: newExpanded };
          });
        },

        selectBooking: (booking) => set({ selectedBooking: booking }),

        clearError: () => set({ error: null }),

        // Computed getters
        getBookingsByDate: (date) => {
          return get().bookings.filter(booking => {
            const depDate = booking.departureDate?.split('T')[0];
            const retDate = booking.returnDate?.split('T')[0];
            return depDate && retDate && date >= depDate && date <= retDate;
          });
        },

        getBookingsByStatus: (status) => {
          return get().bookings.filter(booking => booking.status === status);
        },

        getBookingsByManager: (managerId) => {
          return get().bookings.filter(booking => 
            booking.managers.some(m => m.id === managerId)
          );
        }
      }),
      {
        name: 'team-booking-store'
      }
    )
  )
);

// Selectors for optimized re-renders
export const selectBookings = (state: TeamBookingState) => state.bookings;
export const selectSelectedBooking = (state: TeamBookingState) => state.selectedBooking;
export const selectIsLoading = (state: TeamBookingState) => state.isLoading;
export const selectError = (state: TeamBookingState) => state.error;