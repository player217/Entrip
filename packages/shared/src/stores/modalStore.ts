import { create } from 'zustand';
import { BookingEvent } from '../types/booking';

interface ModalState {
  // Quick Add Modal
  isQuickAddModalOpen: boolean;
  selectedDate: Date | null;
  openQuickAddModal: (date?: Date) => void;
  closeQuickAddModal: () => void;
  
  // Edit Booking Modal
  isEditModalOpen: boolean;
  selectedBooking: BookingEvent | null;
  openEditModal: (booking: BookingEvent) => void;
  closeEditModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  // Quick Add Modal
  isQuickAddModalOpen: false,
  selectedDate: null,
  
  openQuickAddModal: (date) => set({
    isQuickAddModalOpen: true,
    selectedDate: date || null
  }),
  
  closeQuickAddModal: () => set({
    isQuickAddModalOpen: false,
    selectedDate: null
  }),
  
  // Edit Booking Modal
  isEditModalOpen: false,
  selectedBooking: null,
  
  openEditModal: (booking) => set({
    isEditModalOpen: true,
    selectedBooking: booking
  }),
  
  closeEditModal: () => set({
    isEditModalOpen: false,
    selectedBooking: null
  })
}));