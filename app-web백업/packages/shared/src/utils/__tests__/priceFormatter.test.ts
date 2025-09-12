import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  parseCurrency,
  calculateTax,
  calculateDiscount,
  formatExchangeRate,
  convertCurrency,
} from '../priceFormatter';

describe('priceFormatter', () => {
  describe('formatCurrency', () => {
    it('formats KRW currency with default options', () => {
      expect(formatCurrency(1234567, 'KRW')).toBe('₩1,234,567');
    });

    it('formats USD currency with default options', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('formats EUR currency with default options', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    });

    it('formats JPY currency with default options', () => {
      expect(formatCurrency(1234567, 'JPY')).toBe('¥1,234,567');
    });

    it('formats CNY currency with default options', () => {
      expect(formatCurrency(1234.56, 'CNY')).toBe('¥1,234.56');
    });

    it('formats negative amounts correctly', () => {
      expect(formatCurrency(-1234567, 'KRW')).toBe('-₩1,234,567');
      expect(formatCurrency(-1234.56, 'USD')).toBe('-$1,234.56');
    });

    it('formats without symbol when showSymbol is false', () => {
      expect(formatCurrency(1234567, 'KRW', { showSymbol: false })).toBe('1,234,567');
      expect(formatCurrency(1234.56, 'USD', { showSymbol: false })).toBe('1,234.56');
    });

    it('formats with custom fraction digits', () => {
      expect(formatCurrency(1234.567, 'USD', { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe('$1,234.567');
      expect(formatCurrency(1234.5, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe('$1,235');
    });

    it('uses default currency when not specified', () => {
      expect(formatCurrency(1234567)).toBe('₩1,234,567');
    });
  });

  describe('formatNumber', () => {
    it('formats number with Korean locale', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });

    it('formats number with decimal places', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.567, 0)).toBe('1,235');
      expect(formatNumber(1234.567, 3)).toBe('1,234.567');
    });

    it('formats negative numbers', () => {
      expect(formatNumber(-1234567)).toBe('-1,234,567');
    });

    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('handles very large numbers', () => {
      expect(formatNumber(1234567890123)).toBe('1,234,567,890,123');
    });
  });

  describe('formatPercentage', () => {
    it('formats decimal as percentage', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(0.5)).toBe('50.00%');
      expect(formatPercentage(1)).toBe('100.00%');
    });

    it('formats with custom decimal places', () => {
      expect(formatPercentage(0.12345, 3)).toBe('12.345%');
      expect(formatPercentage(0.12345, 0)).toBe('12%');
      expect(formatPercentage(0.12345, 1)).toBe('12.3%');
    });

    it('formats when value is already percentage', () => {
      expect(formatPercentage(12.34, 2, true)).toBe('12.34%');
      expect(formatPercentage(50, 0, true)).toBe('50%');
    });

    it('formats negative percentages', () => {
      expect(formatPercentage(-0.1234)).toBe('-12.34%');
    });

    it('formats zero percentage', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });
  });

  describe('parseCurrency', () => {
    it('parses KRW currency string', () => {
      expect(parseCurrency('₩1,234,567')).toBe(1234567);
    });

    it('parses USD currency string', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
    });

    it('parses EUR currency string', () => {
      expect(parseCurrency('€1,234.56')).toBe(1234.56);
    });

    it('parses JPY currency string', () => {
      expect(parseCurrency('¥1,234,567')).toBe(1234567);
    });

    it('parses string without currency symbol', () => {
      expect(parseCurrency('1,234,567')).toBe(1234567);
      expect(parseCurrency('1,234.56')).toBe(1234.56);
    });

    it('parses negative amounts', () => {
      expect(parseCurrency('-₩1,234,567')).toBe(-1234567);
      expect(parseCurrency('-$1,234.56')).toBe(-1234.56);
    });

    it('handles strings with spaces', () => {
      expect(parseCurrency(' ₩ 1,234,567 ')).toBe(1234567);
    });
  });

  describe('calculateTax', () => {
    it('calculates tax correctly', () => {
      expect(calculateTax(1000, 0.1)).toBe(100);
      expect(calculateTax(5000, 0.15)).toBe(750);
      expect(calculateTax(10000, 0.2)).toBe(2000);
    });

    it('handles zero tax rate', () => {
      expect(calculateTax(1000, 0)).toBe(0);
    });

    it('handles negative amounts', () => {
      expect(calculateTax(-1000, 0.1)).toBe(-100);
    });

    it('handles decimal tax rates', () => {
      expect(calculateTax(1000, 0.075)).toBe(75);
    });
  });

  describe('calculateDiscount', () => {
    it('calculates percentage discount', () => {
      expect(calculateDiscount(1000, 10)).toBe(100);
      expect(calculateDiscount(5000, 20)).toBe(1000);
      expect(calculateDiscount(10000, 50)).toBe(5000);
    });

    it('calculates absolute discount', () => {
      expect(calculateDiscount(1000, 100, 'absolute')).toBe(100);
      expect(calculateDiscount(5000, 500, 'absolute')).toBe(500);
    });

    it('handles discount greater than original price', () => {
      expect(calculateDiscount(1000, 150, 'percentage')).toBe(1000);
      expect(calculateDiscount(1000, 2000, 'absolute')).toBe(1000);
    });

    it('handles zero discount', () => {
      expect(calculateDiscount(1000, 0)).toBe(0);
      expect(calculateDiscount(1000, 0, 'absolute')).toBe(0);
    });

    it('caps discount at original price for negative amounts', () => {
      expect(calculateDiscount(-1000, 10)).toBe(-1000);
    });
  });

  describe('formatExchangeRate', () => {
    it('formats exchange rate with default decimal places', () => {
      expect(formatExchangeRate(1234.567)).toBe('1,234.57');
    });

    it('formats exchange rate with custom decimal places', () => {
      expect(formatExchangeRate(1234.567, null, 3)).toBe('1,234.567');
      expect(formatExchangeRate(1234.567, null, 0)).toBe('1,235');
    });

    it('formats exchange rate with currency symbol', () => {
      expect(formatExchangeRate(1234.567, 'USD')).toBe('$1,234.57');
      expect(formatExchangeRate(1234.567, 'KRW')).toBe('₩1,234.57');
    });

    it('handles null currency', () => {
      expect(formatExchangeRate(1234.567, null)).toBe('1,234.57');
    });

    it('formats very small rates', () => {
      expect(formatExchangeRate(0.0012345, null, 6)).toBe('0.001235');
    });
  });

  describe('convertCurrency', () => {
    it('converts currency with normal rate', () => {
      expect(convertCurrency(1000, 1.2)).toBe(1200);
      expect(convertCurrency(5000, 0.8)).toBe(4000);
    });

    it('converts currency in reverse', () => {
      expect(convertCurrency(1200, 1.2, true)).toBe(1000);
      expect(convertCurrency(4000, 0.8, true)).toBe(5000);
    });

    it('converts with custom decimal places', () => {
      expect(convertCurrency(1234.567, 1.2345, false, 3)).toBe(1524.073);
      expect(convertCurrency(1234.567, 1.2345, false, 0)).toBe(1524);
    });

    it('handles zero rate', () => {
      expect(convertCurrency(1000, 0)).toBe(0);
      expect(convertCurrency(1000, 0, true)).toBe(Infinity);
    });

    it('handles negative amounts', () => {
      expect(convertCurrency(-1000, 1.2)).toBe(-1200);
      expect(convertCurrency(-1200, 1.2, true)).toBe(-1000);
    });

    it('handles very small rates', () => {
      expect(convertCurrency(1000000, 0.001)).toBe(1000);
    });

    it('handles very large rates', () => {
      expect(convertCurrency(1, 1000)).toBe(1000);
    });
  });
});