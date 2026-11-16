import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BookingEditor } from '@/features/bookings/BookingEditor';
import { makeDraft } from '@/features/bookings/booking-model';

test('booking selects have stable accessible labels and update their exact fields', () => {
  const draft = makeDraft(undefined, '2026-12-11', '담당자');
  draft.hotelInfo = [{ id: 'h1', name: '호텔', date: '2026-12-11', description: '', quantity: 1, unitPrice: 100, currency: 'USD' }];
  const onChange = jest.fn();
  render(<BookingEditor session={{ draft, baseline: JSON.stringify(draft) }} onChange={onChange} onClose={jest.fn()} onSave={jest.fn()} onReload={jest.fn()} onDelete={jest.fn()} busy={false} error="" />);
  expect(screen.getByRole('combobox', { name: '예약 유형', exact: true })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('예약 상태', { exact: true }), { target: { value: 'CONFIRMED' } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
  fireEvent.change(screen.getByLabelText('통화', { exact: true }), { target: { value: 'JPY' } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ currency: 'JPY' }));
  fireEvent.change(screen.getByLabelText('호텔 통화', { exact: true }), { target: { value: 'KRW' } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hotelInfo: [expect.objectContaining({ id: 'h1', currency: 'KRW' })] }));
});
