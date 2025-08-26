import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make vi available globally
(globalThis as any).vi = vi;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.location
delete (window as any).location;
window.location = { href: '', pathname: '/', search: '', hash: '' } as any;