import {
  utcToKst,
  kstToUtc,
  getMonthEndDate,
  formatKoreanDate,
  formatKoreanShortDate,
  isWeekend,
  isBusinessDay,
  getNextBusinessDay,
  getPreviousBusinessDay,
  addBusinessDays,
  isDateInRange,
  validateDateRange,
  getDaysBetween,
  formatKoreanDateRange,
  startOfDay,
  endOfDay,
  isKoreanHoliday,
} from '../dateHelpers';

describe('dateHelpers', () => {
  // Mock current date for consistent testing
  const mockDate = new Date('2024-01-15T12:00:00Z');
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Timezone Conversion', () => {
    describe('utcToKst', () => {
      it('should convert UTC time to KST (UTC+9)', () => {
        const utcDate = new Date('2024-01-01T00:00:00Z');
        const kstDate = utcToKst(utcDate);
        
        // KST is 9 hours ahead of UTC
        expect(kstDate.toISOString()).toBe('2024-01-01T09:00:00.000Z');
      });

      it('should handle dates crossing day boundary', () => {
        const utcDate = new Date('2024-01-01T20:00:00Z');
        const kstDate = utcToKst(utcDate);
        
        // 20:00 UTC + 9 hours = 05:00 next day
        expect(kstDate.toISOString()).toBe('2024-01-02T05:00:00.000Z');
      });

      it('should handle dates crossing month boundary', () => {
        const utcDate = new Date('2024-01-31T20:00:00Z');
        const kstDate = utcToKst(utcDate);
        
        // January 31 20:00 UTC + 9 hours = February 1 05:00
        expect(kstDate.toISOString()).toBe('2024-02-01T05:00:00.000Z');
      });
    });

    describe('kstToUtc', () => {
      it('should convert KST time to UTC', () => {
        const kstDate = new Date('2024-01-01T09:00:00Z');
        const utcDate = kstToUtc(kstDate);
        
        // 09:00 - 9 hours = 00:00
        expect(utcDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should handle dates crossing day boundary backwards', () => {
        const kstDate = new Date('2024-01-02T05:00:00Z');
        const utcDate = kstToUtc(kstDate);
        
        // January 2 05:00 - 9 hours = January 1 20:00
        expect(utcDate.toISOString()).toBe('2024-01-01T20:00:00.000Z');
      });
    });
  });

  describe('Month End Date Calculations', () => {
    describe('getMonthEndDate', () => {
      it('should return last day of January (31 days)', () => {
        const date = new Date('2024-01-15');
        const monthEnd = getMonthEndDate(date);
        
        expect(monthEnd.getDate()).toBe(31);
        expect(monthEnd.getMonth()).toBe(0); // January
      });

      it('should return last day of February in non-leap year (28 days)', () => {
        const date = new Date('2023-02-15');
        const monthEnd = getMonthEndDate(date);
        
        expect(monthEnd.getDate()).toBe(28);
        expect(monthEnd.getMonth()).toBe(1); // February
      });

      it('should return last day of February in leap year (29 days)', () => {
        const date = new Date('2024-02-15');
        const monthEnd = getMonthEndDate(date);
        
        expect(monthEnd.getDate()).toBe(29);
        expect(monthEnd.getMonth()).toBe(1); // February
      });

      it('should return last day of April (30 days)', () => {
        const date = new Date('2024-04-15');
        const monthEnd = getMonthEndDate(date);
        
        expect(monthEnd.getDate()).toBe(30);
        expect(monthEnd.getMonth()).toBe(3); // April
      });

      it('should handle December correctly', () => {
        const date = new Date('2024-12-15');
        const monthEnd = getMonthEndDate(date);
        
        expect(monthEnd.getDate()).toBe(31);
        expect(monthEnd.getMonth()).toBe(11); // December
        expect(monthEnd.getFullYear()).toBe(2024);
      });
    });
  });

  describe('Date Formatting for Korean Locale', () => {
    describe('formatKoreanDate', () => {
      it('should format date with default options', () => {
        const date = new Date('2024-01-15');
        const formatted = formatKoreanDate(date);
        
        expect(formatted).toContain('2024년');
        expect(formatted).toContain('1월');
        expect(formatted).toContain('15일');
        expect(formatted).toContain('월요일');
      });

      it('should format date with custom options', () => {
        const date = new Date('2024-01-15');
        const formatted = formatKoreanDate(date, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        
        expect(formatted).toMatch(/2024\. 1\. 15\./);
      });

      it('should format date with short weekday', () => {
        const date = new Date('2024-01-15');
        const formatted = formatKoreanDate(date, {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        
        expect(formatted).toContain('월');
      });
    });

    describe('formatKoreanShortDate', () => {
      it('should format date as YYYY.MM.DD', () => {
        const date = new Date('2024-01-15');
        const formatted = formatKoreanShortDate(date);
        
        expect(formatted).toBe('2024.01.15');
      });

      it('should pad single digit months and days', () => {
        const date = new Date('2024-03-05');
        const formatted = formatKoreanShortDate(date);
        
        expect(formatted).toBe('2024.03.05');
      });

      it('should handle December 31st', () => {
        const date = new Date('2024-12-31');
        const formatted = formatKoreanShortDate(date);
        
        expect(formatted).toBe('2024.12.31');
      });
    });

    describe('formatKoreanDateRange', () => {
      it('should format date range with days count', () => {
        const startDate = new Date('2024-01-15');
        const endDate = new Date('2024-01-20');
        const formatted = formatKoreanDateRange(startDate, endDate);
        
        expect(formatted).toBe('2024.01.15 ~ 2024.01.20 (6일)');
      });

      it('should handle single day range', () => {
        const date = new Date('2024-01-15');
        const formatted = formatKoreanDateRange(date, date);
        
        expect(formatted).toBe('2024.01.15 ~ 2024.01.15 (1일)');
      });

      it('should handle cross-month range', () => {
        const startDate = new Date('2024-01-28');
        const endDate = new Date('2024-02-03');
        const formatted = formatKoreanDateRange(startDate, endDate);
        
        expect(formatted).toBe('2024.01.28 ~ 2024.02.03 (7일)');
      });
    });
  });

  describe('Business Day Calculations', () => {
    describe('isWeekend', () => {
      it('should return true for Saturday', () => {
        const saturday = new Date('2024-01-13'); // Saturday
        expect(isWeekend(saturday)).toBe(true);
      });

      it('should return true for Sunday', () => {
        const sunday = new Date('2024-01-14'); // Sunday
        expect(isWeekend(sunday)).toBe(true);
      });

      it('should return false for weekdays', () => {
        const monday = new Date('2024-01-15');
        const tuesday = new Date('2024-01-16');
        const wednesday = new Date('2024-01-17');
        const thursday = new Date('2024-01-18');
        const friday = new Date('2024-01-19');
        
        expect(isWeekend(monday)).toBe(false);
        expect(isWeekend(tuesday)).toBe(false);
        expect(isWeekend(wednesday)).toBe(false);
        expect(isWeekend(thursday)).toBe(false);
        expect(isWeekend(friday)).toBe(false);
      });
    });

    describe('isBusinessDay', () => {
      it('should return false for weekends', () => {
        const saturday = new Date('2024-01-13');
        const sunday = new Date('2024-01-14');
        
        expect(isBusinessDay(saturday)).toBe(false);
        expect(isBusinessDay(sunday)).toBe(false);
      });

      it('should return true for weekdays', () => {
        const monday = new Date('2024-01-15');
        const friday = new Date('2024-01-19');
        
        expect(isBusinessDay(monday)).toBe(true);
        expect(isBusinessDay(friday)).toBe(true);
      });
    });

    describe('getNextBusinessDay', () => {
      it('should return next day if it is a business day', () => {
        const monday = new Date('2024-01-15');
        const nextDay = getNextBusinessDay(monday);
        
        expect(nextDay.getDate()).toBe(16);
        expect(nextDay.getDay()).toBe(2); // Tuesday
      });

      it('should skip weekend when Friday', () => {
        const friday = new Date('2024-01-19');
        const nextDay = getNextBusinessDay(friday);
        
        expect(nextDay.getDate()).toBe(22);
        expect(nextDay.getDay()).toBe(1); // Monday
      });

      it('should skip to Monday when Saturday', () => {
        const saturday = new Date('2024-01-13');
        const nextDay = getNextBusinessDay(saturday);
        
        expect(nextDay.getDate()).toBe(15);
        expect(nextDay.getDay()).toBe(1); // Monday
      });
    });

    describe('getPreviousBusinessDay', () => {
      it('should return previous day if it is a business day', () => {
        const tuesday = new Date('2024-01-16');
        const prevDay = getPreviousBusinessDay(tuesday);
        
        expect(prevDay.getDate()).toBe(15);
        expect(prevDay.getDay()).toBe(1); // Monday
      });

      it('should skip weekend when Monday', () => {
        const monday = new Date('2024-01-15');
        const prevDay = getPreviousBusinessDay(monday);
        
        expect(prevDay.getDate()).toBe(12);
        expect(prevDay.getDay()).toBe(5); // Friday
      });

      it('should skip to Friday when Sunday', () => {
        const sunday = new Date('2024-01-14');
        const prevDay = getPreviousBusinessDay(sunday);
        
        expect(prevDay.getDate()).toBe(12);
        expect(prevDay.getDay()).toBe(5); // Friday
      });
    });

    describe('addBusinessDays', () => {
      it('should add business days correctly', () => {
        const monday = new Date('2024-01-15');
        const result = addBusinessDays(monday, 3);
        
        expect(result.getDate()).toBe(18);
        expect(result.getDay()).toBe(4); // Thursday
      });

      it('should skip weekends', () => {
        const thursday = new Date('2024-01-18');
        const result = addBusinessDays(thursday, 2);
        
        expect(result.getDate()).toBe(22);
        expect(result.getDay()).toBe(1); // Monday
      });

      it('should handle zero days', () => {
        const date = new Date('2024-01-15');
        const result = addBusinessDays(date, 0);
        
        expect(result.getTime()).toBe(date.getTime());
      });

      it('should handle large number of days', () => {
        const monday = new Date('2024-01-15');
        const result = addBusinessDays(monday, 20);
        
        // 20 business days = 4 weeks
        expect(result.getDate()).toBe(12);
        expect(result.getMonth()).toBe(1); // February
      });
    });
  });

  describe('Date Range Validations', () => {
    describe('isDateInRange', () => {
      it('should return true for date within range', () => {
        const date = new Date('2024-01-15');
        const startDate = new Date('2024-01-10');
        const endDate = new Date('2024-01-20');
        
        expect(isDateInRange(date, startDate, endDate)).toBe(true);
      });

      it('should return true for date equal to start date', () => {
        const date = new Date('2024-01-10');
        const startDate = new Date('2024-01-10');
        const endDate = new Date('2024-01-20');
        
        expect(isDateInRange(date, startDate, endDate)).toBe(true);
      });

      it('should return true for date equal to end date', () => {
        const date = new Date('2024-01-20');
        const startDate = new Date('2024-01-10');
        const endDate = new Date('2024-01-20');
        
        expect(isDateInRange(date, startDate, endDate)).toBe(true);
      });

      it('should return false for date before range', () => {
        const date = new Date('2024-01-05');
        const startDate = new Date('2024-01-10');
        const endDate = new Date('2024-01-20');
        
        expect(isDateInRange(date, startDate, endDate)).toBe(false);
      });

      it('should return false for date after range', () => {
        const date = new Date('2024-01-25');
        const startDate = new Date('2024-01-10');
        const endDate = new Date('2024-01-20');
        
        expect(isDateInRange(date, startDate, endDate)).toBe(false);
      });
    });

    describe('validateDateRange', () => {
      it('should return valid for correct date range', () => {
        const startDate = new Date('2024-02-01');
        const endDate = new Date('2024-02-10');
        const result = validateDateRange(startDate, endDate);
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should return error when start date is after end date', () => {
        const startDate = new Date('2024-02-10');
        const endDate = new Date('2024-02-01');
        const result = validateDateRange(startDate, endDate);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('시작일이 종료일보다 늦을 수 없습니다.');
      });

      it('should return error for range longer than 365 days', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2025-01-02');
        const result = validateDateRange(startDate, endDate);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('예약 기간은 1년을 초과할 수 없습니다.');
      });

      it('should return error for past start date', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-10');
        const result = validateDateRange(startDate, endDate);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('과거 날짜는 선택할 수 없습니다.');
      });

      it('should allow exactly 365 days range', () => {
        const startDate = new Date('2024-02-01');
        const endDate = new Date('2025-01-31');
        const result = validateDateRange(startDate, endDate);
        
        expect(result.isValid).toBe(true);
      });
    });

    describe('getDaysBetween', () => {
      it('should calculate days between two dates', () => {
        const startDate = new Date('2024-01-15');
        const endDate = new Date('2024-01-20');
        const days = getDaysBetween(startDate, endDate);
        
        expect(days).toBe(5);
      });

      it('should return 0 for same date', () => {
        const date = new Date('2024-01-15');
        const days = getDaysBetween(date, date);
        
        expect(days).toBe(0);
      });

      it('should handle dates in reverse order', () => {
        const startDate = new Date('2024-01-20');
        const endDate = new Date('2024-01-15');
        const days = getDaysBetween(startDate, endDate);
        
        expect(days).toBe(5);
      });

      it('should handle cross-month dates', () => {
        const startDate = new Date('2024-01-28');
        const endDate = new Date('2024-02-03');
        const days = getDaysBetween(startDate, endDate);
        
        expect(days).toBe(6);
      });
    });
  });

  describe('Day Boundaries', () => {
    describe('startOfDay', () => {
      it('should set time to 00:00:00.000', () => {
        const date = new Date(2024, 0, 15, 15, 30, 45, 123); // Local time
        const start = startOfDay(date);
        
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
        expect(start.getDate()).toBe(15);
        expect(start.getMonth()).toBe(0);
        expect(start.getFullYear()).toBe(2024);
      });

      it('should not modify original date', () => {
        const date = new Date('2024-01-15T15:30:45.123Z');
        const originalTime = date.getTime();
        startOfDay(date);
        
        expect(date.getTime()).toBe(originalTime);
      });
    });

    describe('endOfDay', () => {
      it('should set time to 23:59:59.999', () => {
        const date = new Date(2024, 0, 15, 15, 30, 45, 123); // Local time
        const end = endOfDay(date);
        
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
        expect(end.getSeconds()).toBe(59);
        expect(end.getMilliseconds()).toBe(999);
        expect(end.getDate()).toBe(15);
        expect(end.getMonth()).toBe(0);
        expect(end.getFullYear()).toBe(2024);
      });

      it('should not modify original date', () => {
        const date = new Date('2024-01-15T15:30:45.123Z');
        const originalTime = date.getTime();
        endOfDay(date);
        
        expect(date.getTime()).toBe(originalTime);
      });
    });
  });

  describe('Korean Holidays', () => {
    describe('isKoreanHoliday', () => {
      it('should recognize New Year\'s Day', () => {
        const newYear = new Date('2024-01-01');
        expect(isKoreanHoliday(newYear)).toBe(true);
      });

      it('should recognize Independence Movement Day', () => {
        const independenceDay = new Date('2024-03-01');
        expect(isKoreanHoliday(independenceDay)).toBe(true);
      });

      it('should recognize Children\'s Day', () => {
        const childrensDay = new Date('2024-05-05');
        expect(isKoreanHoliday(childrensDay)).toBe(true);
      });

      it('should recognize Memorial Day', () => {
        const memorialDay = new Date('2024-06-06');
        expect(isKoreanHoliday(memorialDay)).toBe(true);
      });

      it('should recognize Liberation Day', () => {
        const liberationDay = new Date('2024-08-15');
        expect(isKoreanHoliday(liberationDay)).toBe(true);
      });

      it('should recognize National Foundation Day', () => {
        const foundationDay = new Date('2024-10-03');
        expect(isKoreanHoliday(foundationDay)).toBe(true);
      });

      it('should recognize Hangul Day', () => {
        const hangulDay = new Date('2024-10-09');
        expect(isKoreanHoliday(hangulDay)).toBe(true);
      });

      it('should recognize Christmas', () => {
        const christmas = new Date('2024-12-25');
        expect(isKoreanHoliday(christmas)).toBe(true);
      });

      it('should return false for non-holidays', () => {
        const regularDay = new Date('2024-01-15');
        expect(isKoreanHoliday(regularDay)).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle daylight saving time transitions', () => {
      // Note: Korea doesn't observe DST, but testing for robustness
      const date = new Date('2024-03-10T02:00:00');
      const nextDay = getNextBusinessDay(date);
      
      expect(nextDay.getDate()).toBe(11);
    });

    it('should handle leap year February 29', () => {
      const leapDay = new Date('2024-02-29');
      const formatted = formatKoreanShortDate(leapDay);
      
      expect(formatted).toBe('2024.02.29');
    });

    it('should handle year boundaries', () => {
      const lastDay = new Date('2024-12-31');
      const nextBusinessDay = getNextBusinessDay(lastDay);
      
      expect(nextBusinessDay.getFullYear()).toBe(2025);
      expect(nextBusinessDay.getMonth()).toBe(0); // January
      expect(nextBusinessDay.getDate()).toBe(1);
    });

    it('should handle very old dates', () => {
      const oldDate = new Date('1900-01-01');
      const formatted = formatKoreanShortDate(oldDate);
      
      expect(formatted).toBe('1900.01.01');
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2100-12-31');
      const formatted = formatKoreanShortDate(futureDate);
      
      expect(formatted).toBe('2100.12.31');
    });
  });
});