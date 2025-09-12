'use client';

import React from 'react';
import { Plus } from 'lucide-react';

interface AddBookingFabProps {
  onClick: () => void;
}

export function AddBookingFab({ onClick }: AddBookingFabProps) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center"
      aria-label="예약 추가"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}