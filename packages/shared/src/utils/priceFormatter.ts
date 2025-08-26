type Currency = 'KRW' | 'USD' | 'EUR' | 'JPY' | 'CNY';

interface FormatOptions {
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KRW: '₩',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
};

const DEFAULT_FRACTION_DIGITS: Record<Currency, number> = {
  KRW: 0,
  USD: 2,
  EUR: 2,
  JPY: 0,
  CNY: 2,
};

export function formatCurrency(
  amount: number,
  currency: Currency = 'KRW',
  options: FormatOptions = {}
): string {
  const {
    showSymbol = true,
    minimumFractionDigits = DEFAULT_FRACTION_DIGITS[currency],
    maximumFractionDigits = DEFAULT_FRACTION_DIGITS[currency],
  } = options;

  const formatter = new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const formatted = formatter.format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  const symbol = showSymbol ? CURRENCY_SYMBOLS[currency] : '';

  return `${sign}${symbol}${formatted}`;
}

export function formatNumber(value: number, decimalPlaces?: number): string {
  const options: Intl.NumberFormatOptions = {};
  
  if (decimalPlaces !== undefined) {
    options.minimumFractionDigits = decimalPlaces;
    options.maximumFractionDigits = decimalPlaces;
  }

  return new Intl.NumberFormat('ko-KR', options).format(value);
}

export function formatPercentage(
  value: number,
  decimalPlaces = 2,
  isAlreadyPercentage = false
): string {
  const percentage = isAlreadyPercentage ? value : value * 100;
  return `${formatNumber(percentage, decimalPlaces)}%`;
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and formatting
  const cleaned = value
    .replace(/[₩$€¥]/g, '')
    .replace(/,/g, '')
    .trim();
  
  return parseFloat(cleaned);
}

export function calculateTax(amount: number, taxRate: number): number {
  return amount * taxRate;
}

export function calculateDiscount(
  originalPrice: number,
  discount: number,
  type: 'percentage' | 'absolute' = 'percentage'
): number {
  if (type === 'percentage') {
    const discountAmount = originalPrice * (discount / 100);
    return Math.min(discountAmount, originalPrice);
  } else {
    return Math.min(discount, originalPrice);
  }
}

export function formatExchangeRate(
  rate: number,
  currency?: Currency | null,
  decimalPlaces = 2
): string {
  const formatted = formatNumber(rate, decimalPlaces);
  
  if (currency) {
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${formatted}`;
  }
  
  return formatted;
}

export function convertCurrency(
  amount: number,
  rate: number,
  isReverse = false,
  decimalPlaces = 2
): number {
  if (rate === 0) {
    return isReverse ? Infinity : 0;
  }
  
  const converted = isReverse ? amount / rate : amount * rate;
  const multiplier = Math.pow(10, decimalPlaces);
  
  return Math.round(converted * multiplier) / multiplier;
}