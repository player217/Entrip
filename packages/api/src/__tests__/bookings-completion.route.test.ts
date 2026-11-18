import request from 'supertest';
import { app } from '../index';
import prisma from '../lib/prisma';
import { authService } from '../routes/auth/auth.service';

const base = { teamName: '완성 검증', type: 'FIT', origin: '부산', destination: '삿포로', startDate: '2026-12-11', endDate: '2026-12-14', totalPax: 4, coordinator: '담당자', customerName: '고객', contact: '01012345678', email: 'client@example.com', revenue: 2400000, depositAmount: 300000, currency: 'KRW', status: 'CONFIRMED', hotelInfo: [{ id: 'h1', name: '첫 호텔', date: '2026-12-11', quantity: 2, unitPrice: 14000, currency: 'JPY' }, { id: 'h2', name: '두번째 호텔', date: '2026-12-12', quantity: 2, unitPrice: 18000, currency: 'JPY' }] };
let token: string;
let otherToken: string;
beforeEach(async () => {
  const one = await prisma.user.create({ data: { email: 'booking@one.test', name: '작성자', password: 'unused-hash', role: 'USER', companyCode: 'one', isActive: true } });
  const two = await prisma.user.create({ data: { email: 'booking@two.test', name: '타사', password: 'unused-hash', role: 'USER', companyCode: 'two', isActive: true } });
  token = authService.generateTokens(one).accessToken;
  otherToken = authService.generateTokens(two).accessToken;
});
const auth = () => ({ Cookie: `auth-token=${token}` });

test('persists contacts, repeated details, actual status and history across create, edit and reread', async () => {
  const created = await request(app).post('/api/v2/bookings').set(auth()).send(base).expect(201);
  const id = created.body.data.id;
  expect(created.body.data.status).toBe('CONFIRMED');
  expect(created.body.data.hotelInfo).toHaveLength(2);
  const first = await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(200);
  expect(first.body.data.contact).toBe(base.contact);
  expect(first.body.data.history.map((row: { action: string }) => row.action)).toEqual(['create']);
  await request(app).put(`/api/v2/bookings/${id}`).set(auth()).set('If-Match', '1').send({ contact: '01099998888', currency: 'USD', revenue: 1200, hotelInfo: [base.hotelInfo[1]], status: 'IN_PROGRESS' }).expect(200);
  const second = await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(200);
  expect(second.body.data).toMatchObject({ version: 2, contact: '01099998888', currency: 'USD', status: 'IN_PROGRESS' });
  expect(Number(second.body.data.totalPrice)).toBe(1200);
  expect(second.body.data.hotelInfo).toHaveLength(1);
  expect(second.body.data.history.map((row: { action: string }) => row.action)).toEqual(['update', 'create']);
  await request(app).put(`/api/v2/bookings/${id}`).set(auth()).set('If-Match', '1').send({ contact: 'stale edit' }).expect(412);
  expect(await prisma.bookingHistory.count({ where: { bookingId: id } })).toBe(2);
});

test('denies cross-company read/edit/delete and requires a version even for status changes', async () => {
  const created = await request(app).post('/api/v2/bookings').set(auth()).send(base).expect(201);
  const id = created.body.data.id;
  await request(app).get(`/api/v2/bookings/${id}`).set('Cookie', `auth-token=${otherToken}`).expect(404);
  await request(app).put(`/api/v2/bookings/${id}`).set('Cookie', `auth-token=${otherToken}`).set('If-Match', '1').send({ teamName: 'other' }).expect(404);
  await request(app).delete(`/api/v2/bookings/${id}`).set('Cookie', `auth-token=${otherToken}`).set('If-Match', '1').expect(404);
  await request(app).patch(`/api/v2/bookings/${id}/status`).set(auth()).send({ status: 'cancelled' }).expect(428);
  await request(app).patch(`/api/v2/bookings/${id}/status`).set(auth()).set('If-Match', '1').send({ status: 'cancelled' }).expect(200);
});

test('date overlap includes long trips, pagination reports actual page size, and delete leaves history', async () => {
  const created = await request(app).post('/api/v2/bookings').set(auth()).send({ ...base, startDate: '2026-11-01', endDate: '2027-01-01' }).expect(201);
  const id = created.body.data.id;
  const list = await request(app).get('/api/v2/bookings?startDate=2026-12-01&endDate=2026-12-31&limit=500').set(auth()).expect(200);
  expect(list.body.data.map((row: { id: string }) => row.id)).toContain(id);
  expect(list.body.pagination.limit).toBe(100);
  await request(app).delete(`/api/v2/bookings/${id}`).set(auth()).set('If-Match', '1').expect(204);
  await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(404);
  expect(await prisma.bookingHistory.count({ where: { bookingId: id, action: 'delete' } })).toBe(1);
});

test('reopens and edits booking-specific supplier details while preserving raw historic data and linked settlement values', async () => {
  const created = await request(app).post('/api/v2/bookings').set(auth()).send(base).expect(201);
  const id = created.body.data.id;
  const old = { airline: '한국항공', flightNo: 'KO018', fareRemark: '부분 환불' };
  await prisma.booking.update({ where: { id }, data: { flightInfo: old } });
  await prisma.settlement.create({ data: { bookingId: id, type: 'EXPENSE', currency: 'JPY', amount: 2400, quantity: 2, unitPrice: 1200, memo: '승차권' } });
  const linkedFlight = { bookingId: id, airline: '항공사', flightNumber: 'JJ321', origin: 'PUS', destination: 'CTS',
    departureTime: new Date('2026-12-11T00:00:00Z'), arrivalTime: new Date('2026-12-11T02:30:00Z'), seatNumbers: ['4C'] };
  await prisma.flight.create({ data: { ...linkedFlight, companyCode: 'one' } });
  await prisma.flight.create({ data: { ...linkedFlight, companyCode: 'two', flightNumber: 'HIDDEN' } });
  const first = await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(200);
  expect(first.body.data.flightInfo).toEqual(old);
  expect(first.body.data.flights.map((row: { flightNumber: string }) => row.flightNumber)).toEqual(['JJ321']);
  expect(first.body.data.settlements[0]).toMatchObject({ amount: '2400', currency: 'JPY', quantity: 2, memo: '승차권' });
  expect(first.body.data.user.name).toBe('작성자');
  const hotel = { ...base.hotelInfo[0], fields: { checkOut: '2026-12-14', roomType: '트윈', breakfast: '포함', phone: '000-000' } };
  await request(app).put(`/api/v2/bookings/${id}`).set(auth()).set('If-Match', '1').send({ hotelInfo: [hotel], teamType: '현장 답사' }).expect(200);
  const second = await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(200);
  expect(second.body.data.hotelInfo).toEqual([hotel]);
  expect(second.body.data.teamType).toBe('현장 답사');
  expect(second.body.data.flightInfo).toEqual(old);
  const updatedFlight = { id: 'legacy-flightInfo-0', name: old.flightNo, date: '', description: '', currency: 'KRW', quantity: 1, unitPrice: 0,
    unpriced: true, fields: { airline: old.airline, flightNo: old.flightNo, departureTime: '14:00' }, legacyExtra: JSON.stringify({ fareRemark: old.fareRemark }) };
  await request(app).put(`/api/v2/bookings/${id}`).set(auth()).set('If-Match','2').send({ flightInfo: [updatedFlight] }).expect(200);
  const third = await request(app).get(`/api/v2/bookings/${id}`).set(auth()).expect(200);
  expect(third.body.data.flightInfo).toEqual([updatedFlight]);
  expect(third.body.data.history[0].previousValues.flightInfo).toEqual(old);
});
