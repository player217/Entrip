import { bookingPayload, bookingPrintHtml, makeDraft, type BookingRecord } from '@/features/bookings/booking-model';

const record: BookingRecord = { id: 'booking-1', bookingNumber: 'BK-001', version: 4, teamName: '여행팀', type: 'FIT', origin: '부산', destination: '삿포로', startDate: '2026-12-11T00:00:00Z', endDate: '2026-12-14T00:00:00Z', totalPax: 4, coordinator: '담당자', customerName: '고객', contact: '010-1234-5678', email: 'client@example.com', totalPrice: '2400000', depositAmount: '400000', currency: 'KRW', status: 'CONFIRMED', hotelInfo: [{ id: 'hotel1', name: '첫 호텔', date: '2026-12-11', description: '트윈', quantity: 2, unitPrice: 10000, currency: 'JPY' }] };

test('restores customer, prices, status and repeated details without inventing defaults', () => {
  const draft = makeDraft(record, '2026-01-01', '다른 담당자');
  expect(draft).toMatchObject({ customerName: '고객', contact: '010-1234-5678', email: 'client@example.com', coordinator: '담당자', startDate: '2026-12-11', endDate: '2026-12-14', depositAmount: 400000, status: 'CONFIRMED', revenue: 2400000 });
  expect(draft.hotelInfo).toHaveLength(1);
  expect(draft.hotelInfo[0]?.currency).toBe('JPY');
});
test('preserves legacy JSON when only customer information changes', () => {
  const legacy = { ...record, flightInfo: { flightNumber: 'KE123', departureTime: '09:10' } };
  const original = makeDraft(legacy, '2026-12-11', '');
  const payload = bookingPayload({ record: legacy, draft: { ...original, customerName: '변경한 고객' }, baseline: JSON.stringify(original) });
  expect(payload.customerName).toBe('변경한 고객');
  expect(payload).not.toHaveProperty('flightInfo');
  expect(payload).not.toHaveProperty('hotelInfo');
});
test('sends explicit deletion and multiple edited cost rows', () => {
  const original = makeDraft(record, '2026-12-11', '');
  const payload = bookingPayload({ record, baseline: JSON.stringify(original), draft: { ...original, hotelInfo: [], flightInfo: [{ id: 'flight1', name: '항공1', date: '2026-12-11', description: '', quantity: 4, unitPrice: 500000, currency: 'KRW' }, { id: 'flight2', name: '항공2', date: '2026-12-14', description: '', quantity: 4, unitPrice: 550000, currency: 'KRW' }] } });
  expect(payload.hotelInfo).toEqual([]);
  expect(payload.flightInfo).toHaveLength(2);
});
test('print escapes all customer text and keeps currencies separate', () => {
  const draft = makeDraft({ ...record, teamName: '<script>alert(1)</script>', notes: '<img src=x onerror=alert(1)>' }, '2026-12-11', '');
  const html = bookingPrintHtml(draft, 'BK-001');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('JPY 20,000');
  expect(html).toContain('KRW 2,400,000');
});
