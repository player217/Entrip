import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingModal from '../src/components/BookingModal';
import type { Booking } from '@entrip/shared';
import type { ComponentProps } from 'react';

jest.mock('@/hooks/useBookings', () => {
  const actual = jest.requireActual('@/hooks/useBookings');
  return {
    ...actual,
    useBookings: jest.fn(),
    createBooking: jest.fn(),
    updateBooking: jest.fn(),
  };
});

import { useBookings, createBooking, updateBooking } from '@/hooks/useBookings';

describe('BookingModal interactions', () => {
  const renderModal = (overrideProps: Partial<ComponentProps<typeof BookingModal>> = {}) => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    const props = { isOpen: true, onClose, onSave, ...overrideProps };
    return { onClose, onSave, ...render(<BookingModal {...props} />) };
  };

  const setupMutate = (mock = jest.fn().mockResolvedValue(undefined)) => {
    (useBookings as jest.Mock).mockReturnValue({ mutate: mock });
    return mock;
  };

  const fillRequiredFields = (overrides: Partial<Record<string, string>> = {}) => {
    const entries: Record<string, string> = {
      '고객명 *': '홍길동',
      '연락처 *': '01012345678',
      '여행지 *': '도쿄',
      '출발일 *': '2025-01-01',
      '귀국일 *': '2025-01-04',
      '인원 *': '3',
      ...overrides,
    };

    fireEvent.change(screen.getByLabelText('고객명 *'), { target: { value: entries['고객명 *'] } });
    fireEvent.change(screen.getByLabelText('연락처 *'), { target: { value: entries['연락처 *'] } });
    fireEvent.change(screen.getByLabelText('여행지 *'), { target: { value: entries['여행지 *'] } });
    fireEvent.change(screen.getByLabelText('출발일 *'), { target: { value: entries['출발일 *'] } });
    fireEvent.change(screen.getByLabelText('귀국일 *'), { target: { value: entries['귀국일 *'] } });
    fireEvent.change(screen.getByLabelText('인원 *'), { target: { value: entries['인원 *'] } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking form fields when opened', () => {
    setupMutate();
    renderModal();

    expect(screen.getByText('새 예약')).toBeInTheDocument();
    expect(screen.getByLabelText('고객명 *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('submits new booking and calls createBooking with mapped payload', async () => {
    const mutateMock = setupMutate();
    (createBooking as jest.Mock).mockResolvedValue(undefined);
    const { onClose, onSave } = renderModal();

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('메모'), { target: { value: '요청사항' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(createBooking).toHaveBeenCalledTimes(1));
    const payload = (createBooking as jest.Mock).mock.calls[0][0];
    expect(payload).toMatchObject({
      customerName: '홍길동',
      destination: '도쿄',
      paxCount: 3,
      status: 'PENDING',
      nights: 3,
      days: 4,
      teamName: '홍길동',
    });
    expect(mutateMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it('submits existing booking and calls updateBooking', async () => {
    const mutateMock = setupMutate();
    (updateBooking as jest.Mock).mockResolvedValue(undefined);
    const booking: Partial<Booking> = {
      id: 'booking-123',
      customerName: '김철수',
      destination: '오사카',
      startDate: '2025-02-10',
      endDate: '2025-02-13',
      paxCount: 2,
      status: 'CONFIRMED',
      version: 5,
    };

    renderModal({ booking: booking as Booking });
    fillRequiredFields({ '고객명 *': '김철수', '여행지 *': '오사카', '인원 *': '2' });

    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    await waitFor(() =>
      expect(updateBooking).toHaveBeenCalledWith(
        'booking-123',
        expect.objectContaining({
          customerName: '김철수',
          status: 'CONFIRMED',
        }),
        expect.objectContaining({ ifMatch: 5 })
      )
    );
    expect(mutateMock).toHaveBeenCalled();
  });

  it('displays error message when submission fails', async () => {
    const mutateMock = setupMutate();
    (createBooking as jest.Mock).mockRejectedValue(new Error('network error'));
    renderModal();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(
        screen.getByText('예약 처리 중 오류가 발생했습니다.')
      ).toBeInTheDocument()
    );
    // mutate called optimistically, then once more in catch block for rollback
    expect(mutateMock).toHaveBeenCalledTimes(2);
  });
});
