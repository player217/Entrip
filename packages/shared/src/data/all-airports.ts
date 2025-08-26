import { KOREAN_AIRPORTS } from './korean-airports';

export interface Airport {
  code: string;
  name: string;
  nameEn?: string;
  city?: string;
  country?: string;
}

export const INTERNATIONAL_AIRPORTS: Airport[] = [
  // Japan
  { code: 'NRT', name: '나리타 국제공항', nameEn: 'Narita International Airport', city: '도쿄', country: 'JP' },
  { code: 'HND', name: '하네다 공항', nameEn: 'Haneda Airport', city: '도쿄', country: 'JP' },
  { code: 'KIX', name: '간사이 국제공항', nameEn: 'Kansai International Airport', city: '오사카', country: 'JP' },
  { code: 'NGO', name: '주부 국제공항', nameEn: 'Chubu Centrair International Airport', city: '나고야', country: 'JP' },
  { code: 'FUK', name: '후쿠오카 공항', nameEn: 'Fukuoka Airport', city: '후쿠오카', country: 'JP' },
  
  // China
  { code: 'PVG', name: '상하이 푸동 국제공항', nameEn: 'Shanghai Pudong International Airport', city: '상하이', country: 'CN' },
  { code: 'SHA', name: '상하이 훙차오 국제공항', nameEn: 'Shanghai Hongqiao International Airport', city: '상하이', country: 'CN' },
  { code: 'PEK', name: '베이징 수도 국제공항', nameEn: 'Beijing Capital International Airport', city: '베이징', country: 'CN' },
  { code: 'CAN', name: '광저우 바이윈 국제공항', nameEn: 'Guangzhou Baiyun International Airport', city: '광저우', country: 'CN' },
  
  // Taiwan
  { code: 'TPE', name: '타이완 타오위안 국제공항', nameEn: 'Taiwan Taoyuan International Airport', city: '타이베이', country: 'TW' },
  
  // Hong Kong
  { code: 'HKG', name: '홍콩 국제공항', nameEn: 'Hong Kong International Airport', city: '홍콩', country: 'HK' },
  
  // Thailand
  { code: 'BKK', name: '수완나품 국제공항', nameEn: 'Suvarnabhumi Airport', city: '방콕', country: 'TH' },
  { code: 'DMK', name: '돈므앙 국제공항', nameEn: 'Don Mueang International Airport', city: '방콕', country: 'TH' },
  
  // Singapore
  { code: 'SIN', name: '싱가포르 창이 국제공항', nameEn: 'Singapore Changi Airport', city: '싱가포르', country: 'SG' },
  
  // Vietnam
  { code: 'SGN', name: '떤선녓 국제공항', nameEn: 'Tan Son Nhat International Airport', city: '호치민', country: 'VN' },
  { code: 'HAN', name: '노이바이 국제공항', nameEn: 'Noi Bai International Airport', city: '하노이', country: 'VN' },
  { code: 'DAD', name: '다낭 국제공항', nameEn: 'Da Nang International Airport', city: '다낭', country: 'VN' },
  
  // Philippines
  { code: 'MNL', name: '니노이 아키노 국제공항', nameEn: 'Ninoy Aquino International Airport', city: '마닐라', country: 'PH' },
  { code: 'CEB', name: '막탄-세부 국제공항', nameEn: 'Mactan-Cebu International Airport', city: '세부', country: 'PH' },
  
  // USA
  { code: 'LAX', name: '로스앤젤레스 국제공항', nameEn: 'Los Angeles International Airport', city: '로스앤젤레스', country: 'US' },
  { code: 'SFO', name: '샌프란시스코 국제공항', nameEn: 'San Francisco International Airport', city: '샌프란시스코', country: 'US' },
  { code: 'SEA', name: '시애틀 타코마 국제공항', nameEn: 'Seattle-Tacoma International Airport', city: '시애틀', country: 'US' },
  { code: 'JFK', name: '존 F. 케네디 국제공항', nameEn: 'John F. Kennedy International Airport', city: '뉴욕', country: 'US' },
  
  // Europe
  { code: 'CDG', name: '샤를 드 골 국제공항', nameEn: 'Charles de Gaulle Airport', city: '파리', country: 'FR' },
  { code: 'LHR', name: '히드로 공항', nameEn: 'Heathrow Airport', city: '런던', country: 'GB' },
  { code: 'FRA', name: '프랑크푸르트 공항', nameEn: 'Frankfurt Airport', city: '프랑크푸르트', country: 'DE' },
];

// 모든 공항 데이터 합치기
export const ALL_AIRPORTS: Airport[] = [...KOREAN_AIRPORTS, ...INTERNATIONAL_AIRPORTS];

export function getAirportByCode(code: string): Airport | undefined {
  return ALL_AIRPORTS.find(airport => airport.code === code);
}

export function getAirportName(code: string, locale: 'ko' | 'en' = 'ko'): string {
  const airport = getAirportByCode(code);
  if (!airport) return code;
  return locale === 'ko' ? airport.name : (airport.nameEn || airport.name);
}