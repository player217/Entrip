import {
  formatDateKey,
  createDateKey,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  parseDate,
  isValidDate,
  addDays,
  subtractDays,
  getDaysBetween,
  getMonthName,
  getWeekdayName,
  formatKoreanDate,
  isWeekend,
  isHoliday,
  getBusinessDays,
  formatDateRange,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDateKey', () => {
    it('formats date to yyyy-MM-dd format', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(formatDateKey(date)).toBe('2025-01-15');
    });
  });

  describe('createDateKey', () => {
    it('creates date key from year, month, day', () => {
      expect(createDateKey(2025, 1, 15)).toBe('2025-01-15');
      expect(createDateKey(2025, 12, 31)).toBe('2025-12-31');
    });
  });

  describe('formatDate', () => {
    it('formats date in YYYY-MM-DD format by default', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(formatDate(date)).toBe('2025-01-15');
    });

    it('formats date string in YYYY-MM-DD format', () => {
      expect(formatDate('2025-01-15T10:30:00')).toBe('2025-01-15');
    });

    it('formats date with custom format', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2025');
    });

    it('handles invalid date', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time without seconds', () => {
      const date = new Date('2025-01-15T10:30:45');
      expect(formatDateTime(date)).toBe('2025-01-15 10:30');
    });

    it('includes seconds when specified', () => {
      const date = new Date('2025-01-15T10:30:45');
      expect(formatDateTime(date, true)).toBe('2025-01-15 10:30:45');
    });

    it('handles invalid date', () => {
      expect(formatDateTime('invalid')).toBe('Invalid Date');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('formats seconds ago for time within a minute', () => {
      const date = new Date('2025-01-15T11:59:30');
      expect(formatRelativeTime(date)).toBe('30초 전');
    });

    it('formats minutes ago', () => {
      const date = new Date('2025-01-15T11:30:00');
      expect(formatRelativeTime(date)).toBe('30분 전');
    });

    it('formats hours ago', () => {
      const date = new Date('2025-01-15T09:00:00');
      expect(formatRelativeTime(date)).toBe('3시간 전');
    });

    it('formats days ago', () => {
      const date = new Date('2025-01-13T12:00:00');
      expect(formatRelativeTime(date)).toBe('2일 전');
    });

    it('formats months ago', () => {
      const date = new Date('2024-11-15T12:00:00');
      expect(formatRelativeTime(date)).toBe('2개월 전');
    });

    it('formats years ago', () => {
      const date = new Date('2023-01-15T12:00:00');
      expect(formatRelativeTime(date)).toBe('2년 전');
    });

    it('formats future time', () => {
      const date = new Date('2025-01-15T13:00:00');
      expect(formatRelativeTime(date)).toBe('1시간 후');
    });
  });

  describe('parseDate', () => {
    it('returns Date object as is', () => {
      const date = new Date('2025-01-15');
      expect(parseDate(date)).toBe(date);
    });

    it('parses date string', () => {
      const result = parseDate('2025-01-15');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
    });

    it('parses ISO date string', () => {
      const result = parseDate('2025-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isValidDate', () => {
    it('returns true for valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2025-01-15'))).toBe(true);
    });

    it('returns false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('string')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      const date = new Date('2025-01-15');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('adds negative days', () => {
      const date = new Date('2025-01-15');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('handles month rollover', () => {
      const date = new Date('2025-01-30');
      const result = addDays(date, 5);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });
  });

  describe('subtractDays', () => {
    it('subtracts days', () => {
      const date = new Date('2025-01-15');
      const result = subtractDays(date, 5);
      expect(result.getDate()).toBe(10);
    });

    it('handles month rollover', () => {
      const date = new Date('2025-02-03');
      const result = subtractDays(date, 5);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(29);
    });
  });

  describe('getDaysBetween', () => {
    it('calculates days between dates', () => {
      const start = new Date('2025-01-15');
      const end = new Date('2025-01-20');
      expect(getDaysBetween(start, end)).toBe(5);
    });

    it('returns 0 for same date', () => {
      const date = new Date('2025-01-15');
      expect(getDaysBetween(date, date)).toBe(0);
    });

    it('handles reverse order', () => {
      const start = new Date('2025-01-20');
      const end = new Date('2025-01-15');
      expect(getDaysBetween(start, end)).toBe(5);
    });
  });

  describe('getMonthName', () => {
    it('returns Korean month name for number', () => {
      expect(getMonthName(1)).toBe('1월');
      expect(getMonthName(12)).toBe('12월');
    });

    it('returns English month name for number', () => {
      expect(getMonthName(1, 'en')).toBe('January');
      expect(getMonthName(12, 'en')).toBe('December');
    });

    it('returns month name for Date object', () => {
      const date = new Date('2025-01-15');
      expect(getMonthName(date)).toBe('1월');
      expect(getMonthName(date, 'en')).toBe('January');
    });
  });

  describe('getWeekdayName', () => {
    it('returns Korean weekday names', () => {
      expect(getWeekdayName(new Date('2025-01-13'))).toBe('월요일');
      expect(getWeekdayName(new Date('2025-01-14'))).toBe('화요일');
      expect(getWeekdayName(new Date('2025-01-15'))).toBe('수요일');
    });

    it('returns English weekday names', () => {
      expect(getWeekdayName(new Date('2025-01-13'), 'en')).toBe('Monday');
      expect(getWeekdayName(new Date('2025-01-14'), 'en')).toBe('Tuesday');
    });

    it('returns short weekday names', () => {
      expect(getWeekdayName(new Date('2025-01-13'), 'ko', true)).toBe('월');
      expect(getWeekdayName(new Date('2025-01-14'), 'en', true)).toBe('Tue');
    });

    it('accepts day number (0-6)', () => {
      expect(getWeekdayName(1, 'ko')).toBe('월요일');
      expect(getWeekdayName(0, 'ko')).toBe('일요일');
    });
  });

  describe('formatKoreanDate', () => {
    it('formats date in Korean', () => {
      const date = new Date('2025-01-15');
      expect(formatKoreanDate(date)).toBe('2025년 1월 15일');
    });

    it('includes weekday when specified', () => {
      const date = new Date('2025-01-15');
      expect(formatKoreanDate(date, true)).toBe('2025년 1월 15일 (수)');
    });

    it('handles string dates', () => {
      expect(formatKoreanDate('2025-01-15')).toBe('2025년 1월 15일');
    });
  });

  describe('isWeekend', () => {
    it('returns true for Saturday', () => {
      expect(isWeekend(new Date('2025-01-18'))).toBe(true);
    });

    it('returns true for Sunday', () => {
      expect(isWeekend(new Date('2025-01-19'))).toBe(true);
    });

    it('returns false for weekdays', () => {
      expect(isWeekend(new Date('2025-01-15'))).toBe(false);
      expect(isWeekend(new Date('2025-01-13'))).toBe(false);
    });
  });

  describe('isHoliday', () => {
    it('returns true for Korean holidays', () => {
      expect(isHoliday(new Date('2025-01-01'))).toBe(true); // New Year
      expect(isHoliday(new Date('2025-03-01'))).toBe(true); // Independence Movement Day
      expect(isHoliday(new Date('2025-08-15'))).toBe(true); // Liberation Day
      expect(isHoliday(new Date('2025-10-03'))).toBe(true); // National Foundation Day
      expect(isHoliday(new Date('2025-10-09'))).toBe(true); // Hangeul Day
      expect(isHoliday(new Date('2025-12-25'))).toBe(true); // Christmas
    });

    it('returns true for weekends', () => {
      expect(isWeekend(new Date('2025-01-18'))).toBe(true); // Saturday
      expect(isWeekend(new Date('2025-01-19'))).toBe(true); // Sunday
    });

    it('returns false for regular weekdays', () => {
      expect(isHoliday(new Date('2025-01-15'))).toBe(false);
    });
  });

  describe('getBusinessDays', () => {
    it('calculates business days excluding weekends', () => {
      const start = new Date('2025-01-13'); // Monday
      const end = new Date('2025-01-17'); // Friday
      expect(getBusinessDays(start, end)).toBe(5);
    });

    it('excludes weekends in calculation', () => {
      const start = new Date('2025-01-10'); // Friday
      const end = new Date('2025-01-13'); // Monday
      expect(getBusinessDays(start, end)).toBe(2); // Friday and Monday only
    });

    it('excludes holidays when specified', () => {
      const start = new Date('2024-12-31'); // Tuesday
      const end = new Date('2025-01-02'); // Thursday
      expect(getBusinessDays(start, end, true)).toBe(2); // Dec 31 and Jan 2, excluding New Year
    });

    it('returns 0 for same date', () => {
      const date = new Date('2025-01-15');
      expect(getBusinessDays(date, date)).toBe(0);
    });
  });

  describe('formatDateRange', () => {
    it('formats date range for same month', () => {
      const start = new Date('2025-01-15');
      const end = new Date('2025-01-20');
      expect(formatDateRange(start, end)).toBe('2025년 1월 15일 - 20일');
    });

    it('formats date range for different months', () => {
      const start = new Date('2025-01-15');
      const end = new Date('2025-02-20');
      expect(formatDateRange(start, end)).toBe('2025년 1월 15일 - 2월 20일');
    });

    it('formats date range for different years', () => {
      const start = new Date('2024-12-15');
      const end = new Date('2025-01-20');
      expect(formatDateRange(start, end)).toBe('2024년 12월 15일 - 2025년 1월 20일');
    });

    it('formats same date', () => {
      const date = new Date('2025-01-15');
      expect(formatDateRange(date, date)).toBe('2025년 1월 15일');
    });

    it('uses custom separator', () => {
      const start = new Date('2025-01-15');
      const end = new Date('2025-01-20');
      expect(formatDateRange(start, end, ' ~ ')).toBe('2025년 1월 15일 ~ 20일');
    });
  });
});