export interface InternationalAirport {
  code: string;
  name: string;
  nameEn?: string;
  country?: string;
}

// 주요 국제공항 목록 (추출된 데이터 중 일부)
export const INTERNATIONAL_AIRPORTS: InternationalAirport[] = [
  // 일본
  { code: 'KIX', name: '간사이 국제공항', nameEn: 'Kansai International Airport', country: 'JP' },
  { code: 'NRT', name: '나리타 국제공항', nameEn: 'Narita International Airport', country: 'JP' },
  { code: 'HND', name: '하네다 공항', nameEn: 'Haneda Airport', country: 'JP' },
  { code: 'FUK', name: '후쿠오카 공항', nameEn: 'Fukuoka Airport', country: 'JP' },
  { code: 'NGO', name: '주부 국제공항', nameEn: 'Chubu Centrair International Airport', country: 'JP' },
  { code: 'CTS', name: '신치토세 공항', nameEn: 'New Chitose Airport', country: 'JP' },
  { code: 'OKA', name: '나하 공항', nameEn: 'Naha Airport', country: 'JP' },
  { code: 'KOJ', name: '가고시마 공항', nameEn: 'Kagoshima Airport', country: 'JP' },
  
  // 중국
  { code: 'PEK', name: '베이징 서우두 국제공항', nameEn: 'Beijing Capital International Airport', country: 'CN' },
  { code: 'PKX', name: '베이징 다싱 국제공항', nameEn: 'Beijing Daxing International Airport', country: 'CN' },
  { code: 'PVG', name: '상하이 푸둥 국제공항', nameEn: 'Shanghai Pudong International Airport', country: 'CN' },
  { code: 'SHA', name: '상하이 훙차오 국제공항', nameEn: 'Shanghai Hongqiao International Airport', country: 'CN' },
  { code: 'CAN', name: '광저우 바이윈 국제공항', nameEn: 'Guangzhou Baiyun International Airport', country: 'CN' },
  { code: 'HKG', name: '홍콩 국제공항', nameEn: 'Hong Kong International Airport', country: 'HK' },
  
  // 동남아시아
  { code: 'SIN', name: '싱가포르 창이 공항', nameEn: 'Singapore Changi Airport', country: 'SG' },
  { code: 'BKK', name: '수완나품 공항', nameEn: 'Suvarnabhumi Airport', country: 'TH' },
  { code: 'KUL', name: '쿠알라룸푸르 국제공항', nameEn: 'Kuala Lumpur International Airport', country: 'MY' },
  { code: 'MNL', name: '니노이 아키노 국제공항', nameEn: 'Ninoy Aquino International Airport', country: 'PH' },
  { code: 'CGK', name: '수카르노 하타 국제공항', nameEn: 'Soekarno-Hatta International Airport', country: 'ID' },
  { code: 'HAN', name: '노이바이 국제공항', nameEn: 'Noi Bai International Airport', country: 'VN' },
  { code: 'SGN', name: '탄손누트 국제공항', nameEn: 'Tan Son Nhat International Airport', country: 'VN' },
  
  // 대만
  { code: 'TPE', name: '타이완 타오위안 국제공항', nameEn: 'Taiwan Taoyuan International Airport', country: 'TW' },
  { code: 'TSA', name: '타이베이 쑹산 공항', nameEn: 'Taipei Songshan Airport', country: 'TW' },
  
  // 미주
  { code: 'LAX', name: '로스 앤젤레스 국제공항', nameEn: 'Los Angeles International Airport', country: 'US' },
  { code: 'SFO', name: '샌프란시스코 국제공항', nameEn: 'San Francisco International Airport', country: 'US' },
  { code: 'SEA', name: '시애틀 타코마 국제공항', nameEn: 'Seattle-Tacoma International Airport', country: 'US' },
  { code: 'JFK', name: '존 F 케네디 국제공항', nameEn: 'John F. Kennedy International Airport', country: 'US' },
  { code: 'YVR', name: '밴쿠버 국제공항', nameEn: 'Vancouver International Airport', country: 'CA' },
  { code: 'YYZ', name: '토론토 피어슨 국제공항', nameEn: 'Toronto Pearson International Airport', country: 'CA' },
  
  // 유럽
  { code: 'LHR', name: '히드로 공항', nameEn: 'Heathrow Airport', country: 'GB' },
  { code: 'CDG', name: '샤를 드골 공항', nameEn: 'Charles de Gaulle Airport', country: 'FR' },
  { code: 'FRA', name: '프랑크푸르트 공항', nameEn: 'Frankfurt Airport', country: 'DE' },
  { code: 'AMS', name: '암스테르담 스키폴 공항', nameEn: 'Amsterdam Airport Schiphol', country: 'NL' },
  
  // 중동
  { code: 'DXB', name: '두바이 국제공항', nameEn: 'Dubai International Airport', country: 'AE' },
  { code: 'DOH', name: '하마드 국제공항', nameEn: 'Hamad International Airport', country: 'QA' },
  
  // 오세아니아
  { code: 'SYD', name: '시드니 공항', nameEn: 'Sydney Airport', country: 'AU' },
  { code: 'MEL', name: '멜버른 공항', nameEn: 'Melbourne Airport', country: 'AU' },
  { code: 'AKL', name: '오클랜드 공항', nameEn: 'Auckland Airport', country: 'NZ' },
];

export function getInternationalAirportByCode(code: string): InternationalAirport | undefined {
  return INTERNATIONAL_AIRPORTS.find(airport => airport.code === code);
}

export function getInternationalAirportName(code: string, locale: 'ko' | 'en' = 'ko'): string {
  const airport = getInternationalAirportByCode(code);
  if (!airport) return code;
  return locale === 'ko' ? airport.name : (airport.nameEn || airport.name);
}