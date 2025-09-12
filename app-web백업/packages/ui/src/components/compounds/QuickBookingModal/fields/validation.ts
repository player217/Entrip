import { z } from 'zod';

// 항공편 스키마
export const flightSchema = z.object({
  airline: z.string().min(1, '항공사를 선택해주세요'),
  flightNo: z.string().optional(),
  departDate: z.string().optional(),
  departureTime: z.string().min(1, '출발 시간을 입력해주세요'),
  arriveDate: z.string().optional(),
  arrivalTime: z.string().min(1, '도착 시간을 입력해주세요'),
  from: z.string().optional(),
  to: z.string().optional(),
  note: z.string().optional(),
});

// 차량 스키마
export const vehicleSchema = z.object({
  vendor: z.string().optional(),
  type: z.string().min(1, '차량 유형을 선택해주세요'),
  count: z.number().optional(),
  passengers: z.number().min(1, '인원수는 1명 이상이어야 합니다'),
  duration: z.string().min(1, '이용 시간을 입력해주세요'),
  route: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  returnDate: z.string().optional(),
  returnTime: z.string().optional(),
  driver: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});

// 호텔 스키마
export const hotelSchema = z.object({
  name: z.string().min(1, '호텔명을 입력해주세요'),
  roomType: z.string().min(1, '객실 타입을 선택해주세요'),
  checkIn: z.string().min(1, '체크인 날짜를 선택해주세요'),
  checkOut: z.string().min(1, '체크아웃 날짜를 선택해주세요'),
  nights: z.number().optional(),
  breakfast: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
});

// 정산 스키마
export const settlementSchema = z.object({
  type: z.enum(['income', 'expense']).refine(val => val !== undefined, {
    message: '입금/출금을 선택해주세요',
  }),
  currency: z.string().min(1, '통화를 선택해주세요'),
  amount: z.number().min(0.01, '금액을 입력해주세요'),
  exchangeRate: z.number().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  memo: z.string().optional(),
});

// 메인 폼 스키마
export const quickBookingSchema = z.object({
  // 필수 정보
  teamType: z.string().min(1, '팀 타입을 선택해주세요'),
  teamName: z.string()
    .min(2, '팀명은 2자 이상이어야 합니다')
    .max(50, '팀명은 50자 이하여야 합니다'),
  departureDate: z.string().min(1, '출발일을 선택해주세요'),
  returnDate: z.string().min(1, '도착일을 선택해주세요'),
  origin: z.string().min(1, '출발지를 선택해주세요'),
  destination: z.string().min(1, '목적지를 선택해주세요'),
  flights: z.array(flightSchema).min(1, '최소 1개의 항공편을 입력해주세요'),
  pax: z.number().min(1, '인원수는 1명 이상이어야 합니다'),
  manager: z.string().min(1, '담당자를 선택해주세요'),
  
  // 선택 정보
  vehicles: z.array(vehicleSchema).optional(),
  hotels: z.array(hotelSchema).optional(),
  
  // 고객 정보
  representative: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  
  // 정산
  settlements: z.array(settlementSchema).optional(),
  
  // 기타
  memo: z.string().max(500, '메모는 500자 이하여야 합니다').optional(),
}).refine((data) => {
  return new Date(data.returnDate) >= new Date(data.departureDate);
}, {
  message: "도착일은 출발일 이후여야 합니다",
  path: ["returnDate"]
});

export type QuickBookingFormData = z.infer<typeof quickBookingSchema>;