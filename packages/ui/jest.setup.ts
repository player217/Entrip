import '@testing-library/jest-dom';
import React from 'react';

// Mock @iconify/react
jest.mock('@iconify/react', () => ({
  Icon: function MockIcon({ icon, className, ...props }: { icon: string; className?: string; [key: string]: unknown }) {
    return React.createElement('svg', {
      className,
      ...props,
      'data-icon': icon
    }, React.createElement('title', null, icon));
  },
}));