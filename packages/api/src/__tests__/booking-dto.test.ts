import { BookingCreateDto } from '../routes/bookings/dtos/BookingCreate.dto';
import { BookingUpdateDto } from '../routes/bookings/dtos/BookingUpdate.dto';
const valid = { teamName: '여행팀', type: 'FIT', origin: '부산', destination: '삿포로', startDate: '2026-12-11', endDate: '2026-12-14', totalPax: 4, coordinator: '담당자' };
test('accepts a same-day trip and preserves all real editor fields', () => {
  const input = { ...valid, endDate: valid.startDate, customerName: '고객', contact: '01012345678', email: 'test@example.com', currency: 'USD', depositAmount: 50, status: 'CONFIRMED', hotelInfo: [{ id: 'h1', name: '호텔', description: '트윈', date: '2026-12-11', quantity: 2, unitPrice: 150, currency: 'USD' }] };
  expect(BookingCreateDto.parse(input)).toEqual(input);
});
test.each(['2026-02-30', '2026-13-11'])('rejects invalid calendar date %s', startDate => expect(BookingCreateDto.safeParse({ ...valid, startDate }).success).toBe(false));
test('rejects backward dates and negative or nonfinite costs', () => {
  expect(BookingCreateDto.safeParse({ ...valid, endDate: '2026-12-10' }).success).toBe(false);
  expect(BookingCreateDto.safeParse({ ...valid, revenue: -1 }).success).toBe(false);
  expect(BookingCreateDto.safeParse({ ...valid, revenue: Infinity }).success).toBe(false);
  expect(BookingUpdateDto.safeParse({ startDate: '2026-12-12', endDate: '2026-12-11' }).success).toBe(false);
});
test('strips client identity and version injection', () => {
  const parsed = BookingCreateDto.parse({ ...valid, companyCode: 'other', userId: 'other', version: 999 });
  expect(parsed).not.toHaveProperty('companyCode');
  expect(parsed).not.toHaveProperty('userId');
  expect(parsed).not.toHaveProperty('version');
});
