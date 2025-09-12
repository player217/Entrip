import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BookingModal } from '../BookingModal'

describe('BookingModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <BookingModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('새 예약 등록')).toBeInTheDocument()
  })

  it('should show edit title when booking is provided', () => {
    const mockBooking = {
      teamName: '테스트팀',
      type: '골프',
    }

    render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        booking={mockBooking}
      />
    )

    expect(screen.getByText('예약 수정')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', async () => {
    render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('should call onClose when cancel button is clicked', async () => {
    render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    // Get the cancel button (button, not option)
    const cancelButton = screen.getByRole('button', { name: '취소' })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('should populate form with booking data when provided', () => {
    const mockBooking = {
      teamName: '테스트팀',
      type: '골프',
      origin: '서울',
      destination: '제주',
      startDate: '2025-06-20',
      endDate: '2025-06-22',
      totalPax: 10,
      status: 'confirmed',
      coordinator: '김담당',
      revenue: 5000000,
      notes: '테스트 비고',
    }

    render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        booking={mockBooking}
      />
    )

    expect(screen.getByDisplayValue('테스트팀')).toBeInTheDocument()
    expect(screen.getByDisplayValue('서울')).toBeInTheDocument()
    expect(screen.getByDisplayValue('제주')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-06-20')).toBeInTheDocument()
    expect(screen.getByDisplayValue('김담당')).toBeInTheDocument()
    expect(screen.getByDisplayValue('테스트 비고')).toBeInTheDocument()
  })

  it('should call onSave with form data when submitted', async () => {
    const { container } = render(
      <BookingModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    // Fill form using container queries
    const inputs = container.querySelectorAll('input')
    const teamNameInput = inputs[0] // 팀명
    const originInput = inputs[1] // 출발지
    const destinationInput = inputs[2] // 목적지
    const startDateInput = inputs[3] // 출발일
    const endDateInput = inputs[4] // 도착일
    const coordinatorInput = inputs[7] // 담당자 (skip totalPax and revenue)

    if (teamNameInput) fireEvent.change(teamNameInput, { target: { value: '새로운팀' } })
    if (originInput) fireEvent.change(originInput, { target: { value: '서울' } })
    if (destinationInput) fireEvent.change(destinationInput, { target: { value: '방콕' } })
    if (startDateInput) fireEvent.change(startDateInput, { target: { value: '2025-07-01' } })
    if (endDateInput) fireEvent.change(endDateInput, { target: { value: '2025-07-05' } })
    if (coordinatorInput) fireEvent.change(coordinatorInput, { target: { value: '이담당' } })

    // Submit form
    const submitButton = screen.getByText('등록')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          teamName: '새로운팀',
          origin: '서울',
          destination: '방콕',
          startDate: '2025-07-01',
          endDate: '2025-07-05',
          coordinator: '이담당',
        })
      )
    })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})