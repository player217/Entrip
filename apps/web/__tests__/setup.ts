import '@testing-library/jest-dom';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Ensure React is available in test environment for legacy JSX transforms
;(global as any).React = React;

// Mock window.location
delete (window as any).location;
window.location = { href: '', pathname: '/', search: '', hash: '' } as any;
