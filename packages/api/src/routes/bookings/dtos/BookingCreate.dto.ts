import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Invalid calendar date');
const serviceText = z.string().max(500).optional();
const serviceDate = z.union([date, z.literal('')]).optional();
const serviceTime = z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).optional();
const serviceFields = z.object({
  airline: serviceText, flightNo: serviceText, from: serviceText, to: serviceText,
  departureTime: serviceTime, arrivalDate: serviceDate, arrivalTime: serviceTime,
  checkOut: serviceDate, roomType: serviceText, vendor: serviceText, address: serviceText,
  vehicleType: serviceText, passengers: z.string().regex(/^$|^[0-9]{1,6}$/).optional(),
  route: serviceText, pickupTime: serviceTime, returnDate: serviceDate, returnTime: serviceTime, duration: serviceText,
  endDate: serviceDate, driver: serviceText, phone: serviceText, breakfast: serviceText, nights: z.string().regex(/^$|^[0-9]{1,6}$/).optional(),
});
export const BookingDetailItemDto = z.object({
  id: z.string().max(100), name: z.string().max(200), description: z.string().max(2000).optional(),
  date: serviceDate, fields: serviceFields.optional(), unpriced: z.boolean().optional(), legacyExtra: z.string().max(100000).optional(), quantity: z.number().int().min(1).max(100000),
  unitPrice: z.number().finite().nonnegative(), currency: z.enum(['KRW', 'USD', 'EUR', 'JPY', 'CNY']),
}).refine(row => !row.date || [row.fields?.checkOut, row.fields?.arrivalDate, row.fields?.returnDate, row.fields?.endDate]
  .every(end => !end || end >= row.date!), { message: '이용 종료일은 시작일 이후여야 합니다.' });
export const BookingCreateFields = z.object({
  teamName: z.string().trim().min(1).max(200), teamType: z.string().max(200).optional(),
  type: z.enum(['PACKAGE', 'FIT', 'GROUP', 'BUSINESS', 'INCENTIVE', 'incentive', 'golf', 'honeymoon', 'airtel', 'workshop', 'reward', 'teambuilding']),
  origin: z.string().trim().min(1).max(200), destination: z.string().trim().min(1).max(200),
  startDate: date, endDate: date,
  totalPax: z.number().int().positive().max(100000), coordinator: z.string().trim().min(1).max(200),
  customerName: z.string().max(200).optional(), representative: z.string().max(200).optional(),
  contact: z.string().max(100).optional(), email: z.union([z.string().email(), z.literal('')]).optional(),
  revenue: z.number().finite().nonnegative().optional(), totalPrice: z.number().finite().nonnegative().optional(),
  depositAmount: z.number().finite().nonnegative().optional(), currency: z.enum(['KRW', 'USD', 'EUR', 'JPY', 'CNY']).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  flightInfo: z.array(BookingDetailItemDto).max(100).optional(), hotelInfo: z.array(BookingDetailItemDto).max(100).optional(),
  vehicleInfo: z.array(BookingDetailItemDto).max(100).optional(), insuranceInfo: z.array(BookingDetailItemDto).max(100).optional(),
  notes: z.string().max(20000).optional(),
});
export const BookingCreateDto = BookingCreateFields.refine(value => value.endDate >= value.startDate, {
  message: 'End date must be on or after start date', path: ['endDate'],
});
export type BookingCreateInput = z.infer<typeof BookingCreateDto>;
