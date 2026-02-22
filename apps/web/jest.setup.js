// Add custom jest matchers from jest-dom
import '@testing-library/jest-dom';
const React = require('react');

// Default booking/team-booking API mode for tests (can be overridden within individual suites)
process.env.NEXT_PUBLIC_BOOKING_API_MODE = process.env.NEXT_PUBLIC_BOOKING_API_MODE || 'v2';
process.env.NEXT_PUBLIC_TEAM_BOOKING_API_MODE = process.env.NEXT_PUBLIC_TEAM_BOOKING_API_MODE || 'v2';
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://localhost:4001';
process.env.INTERNAL_API_V2_URL = process.env.INTERNAL_API_V2_URL || 'http://localhost:4002';
// Silence test warnings and ensure deterministic behavior for shared flight API utilities
process.env.NEXT_PUBLIC_CRAWLER_API_URL = process.env.NEXT_PUBLIC_CRAWLER_API_URL || 'http://localhost:8001';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock react-beautiful-dnd used by calendar components
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => React.createElement('div', null, children),
  Droppable: ({ children }) => {
    const provided = { droppableProps: {}, innerRef: jest.fn(), placeholder: null };
    return children(provided);
  },
  Draggable: ({ children }) => {
    const provided = { draggableProps: {}, dragHandleProps: {}, innerRef: jest.fn() };
    return children(provided);
  },
}));
