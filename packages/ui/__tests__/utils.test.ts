import { cn } from '../utils';

describe('cn utility', () => {
  it('should merge single class', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('should merge multiple classes', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('should merge Tailwind conflicts correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('mt-4 mb-4', 'my-2')).toBe('my-2');
  });

  it('should handle arrays', () => {
    expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500');
    expect(cn(['base'], ['extra'])).toBe('base extra');
  });

  it('should handle objects', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn([])).toBe('');
    expect(cn({})).toBe('');
  });

  it('should handle complex combinations', () => {
    expect(cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      true && 'conditional',
      undefined,
      'final'
    )).toBe('base array-class object-class conditional final');
  });

  it('should trim extra whitespace', () => {
    expect(cn('  spaced  ', '  classes  ')).toBe('spaced classes');
  });
});