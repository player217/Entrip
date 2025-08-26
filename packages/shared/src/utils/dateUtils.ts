import { format } from 'date-fns';

/**
 * 날짜 객체를 일관된 키 형식으로 변환
 * @param date Date 객체
 * @returns 'yyyy-MM-dd' 형식의 문자열
 */
export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 년, 월, 일을 받아서 일관된 키 형식으로 변환
 * @param year 년도
 * @param month 월 (1-12)
 * @param day 일 (1-31)
 * @returns 'yyyy-MM-dd' 형식의 문자열
 */
export function createDateKey(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  return formatDateKey(date);
}

export function formatDate(date: Date | string, formatStr = 'YYYY-MM-DD'): string {
  try {
    const d = parseDate(date);
    if (!isValidDate(d)) return 'Invalid Date';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return formatStr
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  } catch {
    return 'Invalid Date';
  }
}

export function formatDateTime(date: Date | string, includeSeconds = false): string {
  try {
    const d = parseDate(date);
    if (!isValidDate(d)) return 'Invalid Date';

    const dateStr = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return includeSeconds
      ? `${dateStr} ${hours}:${minutes}:${seconds}`
      : `${dateStr} ${hours}:${minutes}`;
  } catch {
    return 'Invalid Date';
  }
}

export function formatRelativeTime(date: Date | string): string {
  const d = parseDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.abs(diffMs) / 1000;
  const isFuture = diffMs < 0;

  if (diffSec < 10) return '방금';

  const units = [
    { name: '년', seconds: 31536000 },
    { name: '개월', seconds: 2592000 },
    { name: '일', seconds: 86400 },
    { name: '시간', seconds: 3600 },
    { name: '분', seconds: 60 },
    { name: '초', seconds: 1 },
  ];

  for (const unit of units) {
    const value = Math.floor(diffSec / unit.seconds);
    if (value >= 1) {
      return isFuture ? `${value}${unit.name} 후` : `${value}${unit.name} 전`;
    }
  }

  return '방금';
}

export function parseDate(date: Date | string): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

export function isValidDate(date: unknown): boolean {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date as string);
  return !isNaN(d.getTime());
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(parseDate(date));
  d.setDate(d.getDate() + days);
  return d;
}

export function subtractDays(date: Date | string, days: number): Date {
  return addDays(date, -days);
}

export function getDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

const KOREAN_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function getMonthName(month: number | Date, locale: 'ko' | 'en' = 'ko'): string {
  const monthIndex = month instanceof Date ? month.getMonth() : month - 1;
  return locale === 'ko' ? (KOREAN_MONTHS[monthIndex] ?? '') : (ENGLISH_MONTHS[monthIndex] ?? '');
}

const KOREAN_WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const KOREAN_WEEKDAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const ENGLISH_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ENGLISH_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getWeekdayName(day: number | Date, locale: 'ko' | 'en' = 'ko', short = false): string {
  const dayIndex = day instanceof Date ? day.getDay() : day;
  if (locale === 'en') {
    return short ? (ENGLISH_WEEKDAYS_SHORT[dayIndex] ?? '') : (ENGLISH_WEEKDAYS[dayIndex] ?? '');
  }
  return short ? (KOREAN_WEEKDAYS_SHORT[dayIndex] ?? '') : (KOREAN_WEEKDAYS[dayIndex] ?? '');
}

export function formatKoreanDate(date: Date | string, includeWeekday = false): string {
  const d = parseDate(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  let result = `${year}년 ${month}월 ${day}일`;
  
  if (includeWeekday) {
    const weekday = getWeekdayName(d, 'ko', true);
    result += ` (${weekday})`;
  }
  
  return result;
}

export function isWeekend(date: Date | string): boolean {
  const d = parseDate(date);
  const day = d.getDay();
  return day === 0 || day === 6;
}

// Korean national holidays (fixed dates only for simplicity)
const KOREAN_HOLIDAYS = [
  '01-01', // 신정
  '03-01', // 삼일절
  '05-05', // 어린이날
  '06-06', // 현충일
  '08-15', // 광복절
  '10-03', // 개천절
  '10-09', // 한글날
  '12-25', // 크리스마스
];

export function isHoliday(date: Date | string): boolean {
  const d = parseDate(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${month}-${day}`;
  
  return KOREAN_HOLIDAYS.includes(dateStr);
}

export function getBusinessDays(start: Date | string, end: Date | string, excludeHolidays = false): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  
  if (startDate > endDate) return 0;
  if (startDate.getTime() === endDate.getTime()) return 0;
  
  let businessDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (!isWeekend(current)) {
      if (!excludeHolidays || !isHoliday(current)) {
        businessDays++;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
}

export function formatDateRange(start: Date | string, end: Date | string, separator = ' - '): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  
  if (startDate.getTime() === endDate.getTime()) {
    return formatKoreanDate(startDate);
  }
  
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endMonth = endDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  
  if (startYear === endYear && startMonth === endMonth) {
    return `${startYear}년 ${startMonth}월 ${startDay}일${separator}${endDay}일`;
  } else if (startYear === endYear) {
    return `${startYear}년 ${startMonth}월 ${startDay}일${separator}${endMonth}월 ${endDay}일`;
  } else {
    return `${startYear}년 ${startMonth}월 ${startDay}일${separator}${endYear}년 ${endMonth}월 ${endDay}일`;
  }
}