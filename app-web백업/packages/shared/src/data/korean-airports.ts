export interface Airport {
  code: string;
  name: string;
  nameEn?: string;
  city?: string;
}

export const KOREAN_AIRPORTS: Airport[] = [
  { code: 'ICN', name: '인천공항', nameEn: 'Incheon International Airport', city: '인천' },
  { code: 'GMP', name: '김포공항', nameEn: 'Gimpo International Airport', city: '서울' },
  { code: 'CJJ', name: '청주공항', nameEn: 'Cheongju International Airport', city: '청주' },
  { code: 'YNY', name: '양양공항', nameEn: 'Yangyang International Airport', city: '양양' },
  { code: 'KUV', name: '군산공항', nameEn: 'Gunsan Airport', city: '군산' },
  { code: 'WJU', name: '원주공항', nameEn: 'Wonju Airport', city: '원주' },
  { code: 'PUS', name: '김해공항', nameEn: 'Gimhae International Airport', city: '부산' },
  { code: 'CJU', name: '제주공항', nameEn: 'Jeju International Airport', city: '제주' },
  { code: 'TAE', name: '대구공항', nameEn: 'Daegu International Airport', city: '대구' },
  { code: 'KWJ', name: '광주공항', nameEn: 'Gwangju Airport', city: '광주' },
  { code: 'RSU', name: '여수공항', nameEn: 'Yeosu Airport', city: '여수' },
  { code: 'USN', name: '울산공항', nameEn: 'Ulsan Airport', city: '울산' },
  { code: 'KPO', name: '포항경주공항', nameEn: 'Pohang Gyeongju Airport', city: '포항' },
  { code: 'HIN', name: '사천공항', nameEn: 'Sacheon Airport', city: '사천' },
  { code: 'MWX', name: '무안공항', nameEn: 'Muan International Airport', city: '무안' },
];

export function getAirportByCode(code: string): Airport | undefined {
  return KOREAN_AIRPORTS.find(airport => airport.code === code);
}

export function getAirportName(code: string, locale: 'ko' | 'en' = 'ko'): string {
  const airport = getAirportByCode(code);
  if (!airport) return code;
  return locale === 'ko' ? airport.name : (airport.nameEn || airport.name);
}