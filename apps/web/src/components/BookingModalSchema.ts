import { z } from 'zod';

export const bookingSchema = z.object({
  customerName: z.string().min(1, '고객명은 필수입니다'),
  phoneNumber: z.string()
    .min(1, '연락처는 필수입니다')
    .regex(/^[0-9-]+$/, '올바른 전화번호 형식이 아닙니다'),
  email: z.string()
    .optional()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.string().email('올바른 이메일 형식이 아닙니다').optional()),
  destination: z.string().min(1, '여행지는 필수입니다'),
  departureDate: z.string().min(1, '출발일은 필수입니다'),
  returnDate: z.string().min(1, '귀국일은 필수입니다'),
  numberOfPeople: z.number()
    .int('인원은 정수여야 합니다')
    .min(1, '최소 1명 이상이어야 합니다'),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  notes: z.string().optional(),
}).refine(data => {
  const departure = new Date(data.departureDate);
  const returnDate = new Date(data.returnDate);
  return returnDate >= departure;
}, {
  message: '귀국일은 출발일 이후여야 합니다',
  path: ['returnDate'],
});

export type BookingFormData = z.infer<typeof bookingSchema>;