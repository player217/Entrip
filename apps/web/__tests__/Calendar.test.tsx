import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ReservationsPage from '../app/(main)/reservations/page';

// Mock the required modules
vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({
    bookings: [
      {
        id: '1',
        customerName: '테스트 고객',
        destination: '서울',
        departureDate: '2025-06-20',
        returnDate: '2025-06-25',
        numberOfPeople: 2,
        status: 'confirmed',
      },
    ],
    isLoading: false,
    isError: false,
    mutate: vi.fn(),
  }),
}));

vi.mock('@entrip/ui', () => ({
  CalendarMonth: ({ bookings }: any) => <div data-testid="calendar-month">캘린더 월</div>,
  CalendarWeek: ({ events }: any) => <div data-testid="calendar-week">캘린더 주</div>,
  DataGrid: ({ data }: any) => <div data-testid="data-grid">데이터 그리드: {data.length}개 항목</div>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Calendar renders', () => {
  it('should render calendar components and reservation data', () => {
    render(<ReservationsPage />);
    
    // Check if title is rendered
    expect(screen.getByText('예약 관리')).toBeInTheDocument();
    
    // Check if tabs are rendered
    expect(screen.getByText('월별 캘린더')).toBeInTheDocument();
    expect(screen.getByText('주별 캘린더')).toBeInTheDocument();
    expect(screen.getByText('리스트 뷰')).toBeInTheDocument();
    
    // Check if new booking button is rendered
    expect(screen.getByText('+ 새 예약 등록')).toBeInTheDocument();
    
    // Check if calendar month is rendered by default
    expect(screen.getByTestId('calendar-month')).toBeInTheDocument();
  });
});