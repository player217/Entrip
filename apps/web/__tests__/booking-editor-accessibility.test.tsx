import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BookingEditor } from '@/features/bookings/BookingEditor';
import { makeDraft, type BookingRecord } from '@/features/bookings/booking-model';

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

test('detail history expands to readable before and after values, including same-count edits', () => {
  const draft = makeDraft(undefined, '2026-12-11', '담당자');
  const previous = { id: 'hotel', name: '변경 전 호텔', date: '2026-12-11', description: '트윈 객실', quantity: 2, unitPrice: 10000, currency: 'JPY' };
  const updated = { ...previous, name: '변경 후 호텔', unitPrice: 12000, description: '조식 포함\n금연 객실' };
  const record: BookingRecord = { ...draft, id: 'booking', bookingNumber: 'BK-1', version: 2, history: [{
    id: 'history', action: 'update', changedAt: '2026-11-17', changedFields: ['hotelInfo'],
    previousValues: { hotelInfo: [previous] }, newValues: { hotelInfo: [updated] },
  }] };
  render(<BookingEditor session={{ record, draft, baseline: JSON.stringify(draft) }} onChange={jest.fn()} onClose={jest.fn()} onSave={jest.fn()} onReload={jest.fn()} onDelete={jest.fn()} busy={false} error="" />);
  fireEvent.click(screen.getByRole('button', { name: '변경 이력' }));
  const summary = screen.getByText('호텔 변경 전후 항목 보기');
  const detail = summary.closest('details')!;
  expect(detail).not.toHaveAttribute('open');
  fireEvent.click(summary);
  expect(detail).toHaveAttribute('open');
  expect(screen.getByText('변경 전', { exact: true })).toBeVisible();
  expect(screen.getByText('변경 후', { exact: true })).toBeVisible();
  expect(screen.getByText(/1\. 변경 전 호텔/)).toBeVisible();
  expect(screen.getByText(/1\. 변경 후 호텔/)).toHaveTextContent('단가: JPY 12,000 · 합계: JPY 24,000');
  expect(screen.getByText(/1\. 변경 후 호텔/)).toHaveTextContent('조식 포함 금연 객실');
  fireEvent.click(summary);
  expect(detail).not.toHaveAttribute('open');
});

test('an untouched service price is missing and an explicitly entered zero is a quoted amount', () => {
  const draft = makeDraft(undefined, '2026-12-11', '담당자');
  const onChange = jest.fn();
  const props = { onChange, onClose: jest.fn(), onSave: jest.fn(), onReload: jest.fn(), onDelete: jest.fn(), busy: false, error: '' };
  const baseline = JSON.stringify(draft);
  const { rerender } = render(<BookingEditor session={{ draft, baseline }} {...props} />);
  fireEvent.click(screen.getByRole('button', { name: '+ 호텔 추가' }));
  const added = onChange.mock.calls[0][0];
  expect(added.hotelInfo[0].unpriced).toBe(true);
  rerender(<BookingEditor session={{ draft: added, baseline }} {...props} />);
  expect(screen.getByLabelText('호텔명')).toBeRequired();
  expect(screen.getByLabelText('호텔 단가')).toHaveValue(null);
  expect(screen.getByText('단가 미입력', { exact: true })).toBeVisible();
  fireEvent.change(screen.getByLabelText('호텔 단가'), { target: { value: '0' } });
  expect(onChange.mock.calls[1][0].hotelInfo[0]).toMatchObject({ unitPrice: 0, unpriced: false });
});
