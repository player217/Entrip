import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingItem } from '../BookingItem';
import type { BookingEntry } from '@entrip/shared';

describe('BookingItem', () => {
  const mockBooking: BookingEntry = {
    id: '1',
    date: '2024-01-15',
    time: '10:00',
    type: 'departure',
    typeCode: 'GF',
    name: '삼성전자 연수팀',
    title: '삼성전자 연수팀',
    code: 'BOOKING001',
    status: 'CONFIRMED',
    manager: '김담당',
    paxCount: 25
  };

  it('renders booking information correctly', () => {
    render(<BookingItem booking={mockBooking} />);
    
    // The component renders typeCode and name/title separately
    expect(screen.getByText('GF')).toBeInTheDocument();
    expect(screen.getByText(/삼성전자 연수팀/)).toBeInTheDocument();
  });

  it('applies correct background color for CONFIRMED status', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveStyle({ backgroundColor: 'rgb(209, 250, 229)' }); // #D1FAE5
    expect(item).toHaveStyle({ color: 'rgb(6, 95, 70)' }); // #065F46
  });

  it('applies correct background color for PENDING status', () => {
    const pendingBooking = { ...mockBooking, status: 'PENDING' as const };
    render(<BookingItem booking={pendingBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveStyle({ backgroundColor: 'rgb(254, 243, 199)' }); // #FEF3C7
    expect(item).toHaveStyle({ color: 'rgb(146, 64, 14)' }); // #92400E
  });

  it('applies correct background color for CANCELLED status', () => {
    const cancelledBooking = { ...mockBooking, status: 'CANCELLED' as const };
    render(<BookingItem booking={cancelledBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveStyle({ backgroundColor: 'rgb(254, 226, 226)' }); // #FEE2E2
    expect(item).toHaveStyle({ color: 'rgb(153, 27, 27)' }); // #991B1B
  });

  it('shows tooltip on hover', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    fireEvent.mouseEnter(item);
    
    // Check if tooltip content is displayed
    expect(screen.getByText('코드:')).toBeInTheDocument();
    expect(screen.getByText('BOOKING001')).toBeInTheDocument();
    expect(screen.getByText('담당자:')).toBeInTheDocument();
    expect(screen.getByText('김담당')).toBeInTheDocument();
    expect(screen.getByText('인원:')).toBeInTheDocument();
    expect(screen.getByText('25명')).toBeInTheDocument();
    expect(screen.getByText('확정')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    
    // Show tooltip
    fireEvent.mouseEnter(item);
    expect(screen.getByText('코드:')).toBeInTheDocument();
    
    // Hide tooltip
    fireEvent.mouseLeave(item);
    expect(screen.queryByText('코드:')).not.toBeInTheDocument();
  });

  it('displays only type when typeCode is not provided', () => {
    const bookingWithoutCode = { ...mockBooking, typeCode: undefined };
    render(<BookingItem booking={bookingWithoutCode} />);
    
    expect(screen.getByText('FLIGHT')).toBeInTheDocument();
    expect(screen.getByText(/삼성전자 연수팀/)).toBeInTheDocument();
  });

  it('displays only title when name is not provided', () => {
    const bookingWithoutName = { ...mockBooking, name: undefined };
    render(<BookingItem booking={bookingWithoutName} />);
    
    expect(screen.getByText('FL')).toBeInTheDocument();
    expect(screen.getByText(/삼성전자 연수팀/)).toBeInTheDocument();
  });

  it('truncates long names', () => {
    const longNameBooking = {
      ...mockBooking,
      name: '매우 긴 팀 이름입니다. 이것은 정말 매우 긴 팀 이름입니다.',
    };
    render(<BookingItem booking={longNameBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('truncate');
  });

  it('adds hover shadow effect', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('hover:shadow-sm');
  });

  it('has correct transition classes', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('transition-all');
    expect(item).toHaveClass('duration-150');
  });

  it('applies event status class', () => {
    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('event-CONFIRMED');
  });

  it('positions tooltip on the right by default', () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    
    // Mock getBoundingClientRect
    const mockRect = {
      right: 200,
      left: 50,
      top: 100,
      bottom: 150,
    };
    item.getBoundingClientRect = jest.fn(() => mockRect as DOMRect);
    
    fireEvent.mouseEnter(item);
    
    // Check for right positioning class
    const tooltip = document.querySelector('.event-tooltip');
    expect(tooltip).toHaveClass('left-full');
  });

  it('shows status text in Korean in tooltip', () => {
    const { rerender } = render(<BookingItem booking={mockBooking} />);
    
    const item = screen.getByRole('listitem');
    fireEvent.mouseEnter(item);
    
    expect(screen.getByText('확정')).toBeInTheDocument();
    
    // Test other statuses
    fireEvent.mouseLeave(item);
    
    const pendingBooking = { ...mockBooking, status: 'PENDING' as const };
    rerender(<BookingItem booking={pendingBooking} />);
    
    const pendingItem = screen.getByRole('listitem');
    fireEvent.mouseEnter(pendingItem);
    expect(screen.getByText('대기중')).toBeInTheDocument();
  });
});