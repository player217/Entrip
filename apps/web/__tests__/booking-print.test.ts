import { bookingPrintHtml, makeDraft, type BookingRecord, type DetailItem } from '@/features/bookings/booking-model';

function render(html: string) {
  return new DOMParser().parseFromString(html, 'text/html');
}

test('prints the current editor values, operational fields, multiline notes and linked settlement', () => {
  const draft = makeDraft(undefined, '2026-12-11', '이담당');
  draft.teamName = '12월 팀 <수정>';
  draft.teamType = '골프 인센티브';
  draft.notes = '첫째 줄\n둘째 줄';
  draft.flightInfo = [{ id: 'f', name: '출국편', description: '창가', date: '2026-12-11', currency: 'USD', quantity: 2, unitPrice: 125.25,
    fields: { airline: '대한항공', flightNo: 'KE777', from: 'PUS', to: 'CTS', departureTime: '09:15', arrivalTime: '10:55' } }];
  const record = { bookingNumber: 'BK-7', createdAt: '2026-11-18T03:00:00Z', user: { name: '이작성' }, hotels: [{ id: 'h', hotelName: '현지 수배 호텔', checkInDate: '2026-12-11', confirmationNo: 'CONF-447' }], settlements: [{ id: 's', type: 'EXPENSE', amount: '114.50', currency: 'USD', quantity: 1, unitPrice: '114.50', exchangeRate: '9.175000000000001', memo: '가이드 비용' }] } as BookingRecord;
  const doc = render(bookingPrintHtml(draft, record.bookingNumber, { dirty: true, record }));
  expect(doc.querySelector('h1')?.textContent).toBe('12월 팀 <수정>');
  const body = doc.body.textContent;
  expect(body).not.toContain('9.1750000');
  for (const value of ['BK-7', '저장하지 않은 수정본', '개별여행', '골프 인센티브', '현지 수배 호텔', 'CONF-447', '이작성', '대한항공', '편명 KE777', '출발 공항 PUS', '도착 공항 CTS', '출발 시간 09:15', '도착 시간 10:55', '창가', 'USD 125.25', 'USD 250.5', 'USD 114.5', '9.175', '가이드 비용', draft.notes]) expect(body).toContain(value);
});

test('keeps unpriced older records visible without claiming a zero-cost item and separates currencies', () => {
  const draft = makeDraft(undefined, '2026-12-11', '이담당');
  const item: DetailItem = { id: 'h', name: '기존 숙소', description: '', date: '', quantity: 1, unitPrice: 0, currency: 'JPY', unpriced: true, legacyExtra: JSON.stringify({ rating: '4성급' }) };
  draft.hotelInfo = [item];
  draft.vehicleInfo = [{ ...item, id: 'v', name: '버스', quantity: 2, unitPrice: 200, currency: 'KRW', unpriced: false, legacyExtra: undefined }];
  draft.insuranceInfo = [{ ...item, id: 'i', name: '보험', quantity: 3, unitPrice: 20, currency: 'USD', unpriced: false, legacyExtra: undefined }];
  const doc = render(bookingPrintHtml(draft));
  const row = [...doc.querySelectorAll('.finance tbody tr')].find(row => row.textContent?.includes('기존 숙소'));
  expect(row?.textContent).toContain('미입력');
  expect(row?.textContent).not.toContain('JPY 0');
  for (const value of ['미저장 초안', '기존 숙소', '4성급', '금액 미입력 1건', 'KRW 400', 'USD 60']) expect(doc.body.textContent).toContain(value);
});

test('prints a zero exchange rate distinctly from an unrecorded rate', () => {
  const draft = makeDraft(undefined, '2026-12-11', '담당자');
  const entry = { id: 's1', type: 'INCOME', currency: 'USD', amount: 1 };
  const record = { settlements: [{ ...entry, exchangeRate: 0 }, { ...entry, id: 's2', exchangeRate: null }] } as BookingRecord;
  const doc = render(bookingPrintHtml(draft, 'BK-7', { record }));
  const table = [...doc.querySelectorAll('table')].find(table => table.querySelector('h2')?.textContent?.includes('정산 내역'));
  expect([...table!.querySelectorAll('tbody tr')].map(row => row.children[4]?.textContent)).toEqual(['0', '—']);
});
