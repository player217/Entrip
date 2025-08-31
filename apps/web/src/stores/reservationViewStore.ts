import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReservationViewType = 'calendar-month' | 'calendar-week' | 'list' | 'calendar-virtual';

interface ReservationViewState {
  // View state
  activeView: ReservationViewType;
  currentMonth: Date;
  selectedDate: Date | null;
  
  // Modal state
  isModalOpen: boolean;
  selectedBookingId: string | null;
  
  // Selection state
  selectedIds: string[];
  
  // Filter state
  searchQuery: string;
  statusFilter: string | null;
  
  // Actions
  setActiveView: (view: ReservationViewType) => void;
  setCurrentMonth: (month: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  
  openModal: (bookingId?: string) => void;
  closeModal: () => void;
  
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  clearSelection: () => void;
  
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string | null) => void;
  
  reset: () => void;
}

const initialState = {
  activeView: 'calendar-month' as ReservationViewType,
  currentMonth: new Date(),
  selectedDate: null,
  isModalOpen: false,
  selectedBookingId: null,
  selectedIds: [],
  searchQuery: '',
  statusFilter: null,
};

export const useReservationViewStore = create<ReservationViewState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setActiveView: (view) => set({ activeView: view }),
      setCurrentMonth: (month) => set({ currentMonth: month }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      
      openModal: (bookingId) => set({ isModalOpen: true, selectedBookingId: bookingId || null }),
      closeModal: () => set({ isModalOpen: false, selectedBookingId: null }),
      
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      toggleSelectedId: (id) => {
        const { selectedIds } = get();
        const newIds = selectedIds.includes(id)
          ? selectedIds.filter(selectedId => selectedId !== id)
          : [...selectedIds, id];
        set({ selectedIds: newIds });
      },
      clearSelection: () => set({ selectedIds: [] }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatusFilter: (status) => set({ statusFilter: status }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'reservation-view-store',
      partialize: (state) => ({
        activeView: state.activeView,
        currentMonth: state.currentMonth,
        searchQuery: state.searchQuery,
        statusFilter: state.statusFilter,
      }),
    }
  )
);