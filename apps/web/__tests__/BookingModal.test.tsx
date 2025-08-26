import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import BookingModal from '../src/components/BookingModal';

// Mock the hooks
vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({
    mutate: vi.fn(),
  }),
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
}));

describe('BookingModal save', () => {
  it('should render booking form with validation', () => {
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      onSave: vi.fn(),
    };
    
    render(<BookingModal {...props} />);
    
    // Check if form elements are rendered
    expect(screen.getByText('새 예약')).toBeInTheDocument();
    expect(screen.getByText('고객명 *')).toBeInTheDocument();
    expect(screen.getByText('연락처 *')).toBeInTheDocument();
    expect(screen.getByText('여행지 *')).toBeInTheDocument();
    expect(screen.getByText('출발일 *')).toBeInTheDocument();
    expect(screen.getByText('귀국일 *')).toBeInTheDocument();
    expect(screen.getByText('인원 *')).toBeInTheDocument();
    
    // Check if save button is rendered
    const saveButton = screen.getByRole('button', { name: /저장/i });
    expect(saveButton).toBeInTheDocument();
    
    // Check validation messages are shown (due to React Hook Form)
    expect(screen.getByText('고객명은 필수입니다')).toBeInTheDocument();
  });
});