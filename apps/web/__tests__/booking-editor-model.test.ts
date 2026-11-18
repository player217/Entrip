import { bookingHistoryChanges, bookingPayload, bookingPrintHtml, makeDraft, type BookingRecord } from '@/features/bookings/booking-model';

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

test('history translates field names, coalesces duplicate amount fields and preserves before/after values', async () => {
  const { bookingHistoryFields, bookingHistoryChanges } = await import('@/features/bookings/booking-model');
  expect(bookingHistoryFields(['teamName', 'totalPrice', 'revenue', 'hotelInfo', 'unknownInternalKey'])).toEqual(['팀명', '판매금액', '호텔', '기타 예약 정보']);
  const changes = bookingHistoryChanges({ id: 'h', action: 'update', changedAt: '2026-11-17', changedFields: ['status', 'revenue', 'totalPrice', 'startDate'], previousValues: { status: 'PENDING', totalPrice: 100000, startDate: '2026-11-17T00:00:00Z' }, newValues: { status: 'CONFIRMED', totalPrice: 120000, startDate: '2026-11-18T00:00:00Z' } });
  expect(changes).toEqual([
    { label: '예약 상태', before: '대기', after: '확정', hasValues: true },
    { label: '판매금액', before: '100,000', after: '120,000', hasValues: true },
    { label: '출발일', before: '2026-11-17', after: '2026-11-18', hasValues: true },
  ]);
});

test.each(['hotelInfo', 'flightInfo', 'vehicleInfo', 'insuranceInfo'])('history exposes changed %s values even when the item count stays the same', field => {
  const before = { id: 'detail-1', name: '이전 항목', date: '2026-12-11', description: '이전 상세\n둘째 줄', quantity: 2, unitPrice: 10000, currency: 'JPY' };
  const after = { ...before, name: '변경 항목', date: '2026-12-12', description: '바뀐 상세', quantity: 3, unitPrice: 12500, currency: 'KRW' };
  const [change] = bookingHistoryChanges({ id: 'details', action: 'update', changedAt: '2026-11-17', changedFields: [field], previousValues: { [field]: [before] }, newValues: { [field]: [after] } });
  expect(change?.before).toBe('1. 이전 항목\n일자: 2026-12-11 · 수량: 2\n단가: JPY 10,000 · 합계: JPY 20,000\n상세: 이전 상세\n둘째 줄');
  expect(change?.after).toBe('1. 변경 항목\n일자: 2026-12-12 · 수량: 3\n단가: KRW 12,500 · 합계: KRW 37,500\n상세: 바뀐 상세');
  expect(change?.hasValues).toBe(true);
});

test('history preserves every added or removed detail row and clearly represents an empty list', () => {
  const rows = [
    { id: 'hotel-1', name: '첫 호텔', date: '', description: '', quantity: 1, unitPrice: 0, currency: 'KRW' },
    { id: 'hotel-2', name: '두 번째 호텔', date: '2026-12-12', description: '조식 포함', quantity: 2, unitPrice: 125.5, currency: 'USD' },
  ];
  const base = { id: 'details', action: 'update', changedAt: '2026-11-17', changedFields: ['hotelInfo'] };
  const [added] = bookingHistoryChanges({ ...base, previousValues: { hotelInfo: [] }, newValues: { hotelInfo: rows } });
  expect(added?.before).toBe('등록 내역 없음');
  expect(added?.after).toContain('1. 첫 호텔');
  expect(added?.after).toContain('일자: 미입력 · 수량: 1\n단가: KRW 0 · 합계: KRW 0');
  expect(added?.after).toContain('2. 두 번째 호텔');
  expect(added?.after).toContain('단가: USD 125.5 · 합계: USD 251');
  const [removed] = bookingHistoryChanges({ ...base, previousValues: { hotelInfo: rows }, newValues: { hotelInfo: [] } });
  expect(removed?.before).toBe(added?.after);
  expect(removed?.after).toBe('등록 내역 없음');
});
