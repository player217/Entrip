import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarMonth } from '../CalendarMonth';
import type { BookingEntry } from '@entrip/shared';

describe('CalendarMonth', () => {
  const mockDate = new Date(2025, 5, 1); // June 2025
  const mockOnAddBooking = jest.fn();
  const mockOnBookingClick = jest.fn();

  const mockBookings: Record<string, BookingEntry[]> = {
    '2025-06-15': [
      {
        id: '1',
        date: '2025-06-15',
        status: 'CONFIRMED' as const,
        title: '삼성전자 연수팀',
        type: 'incentive',
      },
    ],
    '2025-06-20': [
      {
        id: '2',
        date: '2025-06-20',
        status: 'PENDING' as const,
        title: '현대차 골프팀',
        type: 'golf',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar with correct month and year', () => {
    render(<CalendarMonth month={mockDate} />);
    
    expect(screen.getByText('2025년 6월')).toBeInTheDocument();
  });

  it('renders all days of the month', () => {
    render(<CalendarMonth month={mockDate} />);
    
    // Check for specific days - use getAllByText since calendar may show adjacent months
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
    
    const fifteens = screen.getAllByText('15');
    expect(fifteens.length).toBeGreaterThan(0);
    
    const thirties = screen.getAllByText('30');
    expect(thirties.length).toBeGreaterThan(0);
  });

  it('renders weekday headers', () => {
    render(<CalendarMonth month={mockDate} />);
    
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    weekDays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('renders bookings on correct dates', () => {
    render(
      <CalendarMonth 
        month={mockDate} 
        bookings={mockBookings} 
      />
    );
    
    expect(screen.getByText('삼성전자 연수팀')).toBeInTheDocument();
    expect(screen.getByText('현대차 골프팀')).toBeInTheDocument();
  });

  it('calls onAddBooking when clicking on a date', () => {
    render(
      <CalendarMonth 
        month={mockDate} 
        onAddBooking={mockOnAddBooking}
      />
    );
    
    // Find the date cell and hover to show the add button
    const dateCell = screen.getByText('15').closest('[role="gridcell"]');
    fireEvent.mouseOver(dateCell!);
    
    // Click the add button for the specific date
    const addButton = screen.getByLabelText('6월 15일에 예약 추가');
    fireEvent.click(addButton);
    
    expect(mockOnAddBooking).toHaveBeenCalledTimes(1);
  });

  it('calls onBookingClick when clicking on a booking', () => {
    render(
      <CalendarMonth 
        month={mockDate} 
        bookings={mockBookings}
        onBookingClick={mockOnBookingClick}
      />
    );
    
    const booking = screen.getByText('삼성전자 연수팀');
    fireEvent.click(booking);
    
    expect(mockOnBookingClick).toHaveBeenCalledWith(mockBookings['2025-06-15'][0]);
  });

  it('navigates to previous month', () => {
    render(<CalendarMonth month={mockDate} />);
    
    const prevButton = screen.getByLabelText('이전 달');
    fireEvent.click(prevButton);
    
    expect(screen.getByText('2025년 5월')).toBeInTheDocument();
  });

  it('navigates to next month', () => {
    render(<CalendarMonth month={mockDate} />);
    
    const nextButton = screen.getByLabelText('다음 달');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('2025년 7월')).toBeInTheDocument();
  });

  it('highlights today date', () => {
    const today = new Date();
    render(<CalendarMonth month={today} />);
    
    // Find the today cell by looking for the element with 'today' class
    const todayCell = document.querySelector('.today');
    
    expect(todayCell).toBeInTheDocument();
    expect(todayCell).toHaveClass('calendar-day-cell');
  });

  it('shows different styles for booking types', () => {
    render(
      <CalendarMonth 
        month={mockDate} 
        bookings={mockBookings}
      />
    );
    
    // BookingItem uses inline styles based on status
    const confirmedBooking = screen.getByText('삼성전자 연수팀').closest('li');
    const pendingBooking = screen.getByText('현대차 골프팀').closest('li');
    
    expect(confirmedBooking).toHaveClass('event-CONFIRMED');
    expect(pendingBooking).toHaveClass('event-PENDING');
  });
});