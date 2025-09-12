/**
 * Date utilities for travel booking system
 * Handles timezone conversions, formatting, and business logic
 */

/**
 * Convert UTC date to KST (Korea Standard Time)
 * KST is UTC+9
 */
export function utcToKst(date: Date): Date {
  // Create a new date object with the time offset applied
  return new Date(date.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * Convert KST date to UTC
 * KST is UTC+9
 */
export function kstToUtc(date: Date): Date {
  // Create a new date object with the time offset removed
  return new Date(date.getTime() - (9 * 60 * 60 * 1000));
}

/**
 * Get the last day of the month for a given date
 */
export function getMonthEndDate(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0);
}

/**
 * Format date to Korean locale string
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatKoreanDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    ...options,
  };
  return date.toLocaleDateString('ko-KR', defaultOptions);
}

/**
 * Format date to Korean short format (YYYY.MM.DD)
 */
export function formatKoreanShortDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if a date is a business day (Monday to Friday)
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Get the next business day from a given date
 */
export function getNextBusinessDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (!isBusinessDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * Get the previous business day from a given date
 */
export function getPreviousBusinessDay(date: Date): Date {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  
  while (!isBusinessDay(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }
  
  return prevDay;
}

/**
 * Add business days to a date
 * @param date - Start date
 * @param days - Number of business days to add
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let count = 0;
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      count++;
    }
  }
  
  return result;
}

/**
 * Check if a date is within a date range
 * @param date - Date to check
 * @param startDate - Start of the range (inclusive)
 * @param endDate - End of the range (inclusive)
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Object with validation result and error message
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): { isValid: boolean; error?: string } {
  if (startDate > endDate) {
    return {
      isValid: false,
      error: '시작일이 종료일보다 늦을 수 없습니다.',
    };
  }
  
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff > 365) {
    return {
      isValid: false,
      error: '예약 기간은 1년을 초과할 수 없습니다.',
    };
  }
  
  if (startDate < new Date()) {
    return {
      isValid: false,
      error: '과거 날짜는 선택할 수 없습니다.',
    };
  }
  
  return { isValid: true };
}

/**
 * Get days between two dates
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format date range in Korean
 */
export function formatKoreanDateRange(startDate: Date, endDate: Date): string {
  const start = formatKoreanShortDate(startDate);
  const end = formatKoreanShortDate(endDate);
  const days = getDaysBetween(startDate, endDate) + 1;
  
  return `${start} ~ ${end} (${days}일)`;
}

/**
 * Get the start of the day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return result;
}

/**
 * Get Korean holidays (simplified version - can be expanded)
 */
export function isKoreanHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Major Korean holidays (fixed dates)
  const holidays = [
    { month: 1, day: 1 },   // New Year's Day
    { month: 3, day: 1 },   // Independence Movement Day
    { month: 5, day: 5 },   // Children's Day
    { month: 6, day: 6 },   // Memorial Day
    { month: 8, day: 15 },  // Liberation Day
    { month: 10, day: 3 },  // National Foundation Day
    { month: 10, day: 9 },  // Hangul Day
    { month: 12, day: 25 }, // Christmas
  ];
  
  return holidays.some(h => h.month === month && h.day === day);
}