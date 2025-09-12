/**
 * Date validation utility to ensure Date objects are valid
 */

export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function ensureValidDate(date: any): Date {
  if (isValidDate(date)) {
    return date;
  }
  
  // If it's a string, try to parse it
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (isValidDate(parsed)) {
      return parsed;
    }
  }
  
  // If it's a number (timestamp), try to create a date
  if (typeof date === 'number') {
    const parsed = new Date(date);
    if (isValidDate(parsed)) {
      return parsed;
    }
  }
  
  // Return current date as fallback
  console.warn('Invalid date provided, using current date as fallback:', date);
  return new Date();
}

export function safeGetFullYear(date: any): number {
  const validDate = ensureValidDate(date);
  return validDate.getFullYear();
}

export function safeGetMonth(date: any): number {
  const validDate = ensureValidDate(date);
  return validDate.getMonth();
}

export function safeGetDate(date: any): number {
  const validDate = ensureValidDate(date);
  return validDate.getDate();
}

export function safeFormat(date: any, formatStr: string): string {
  const validDate = ensureValidDate(date);
  // Simple format implementation for common patterns
  return formatStr
    .replace('yyyy', validDate.getFullYear().toString())
    .replace('MM', String(validDate.getMonth() + 1).padStart(2, '0'))
    .replace('dd', String(validDate.getDate()).padStart(2, '0'));
}