import React from 'react';

interface MockEvent {
  title: string;
  [key: string]: unknown;
}

interface CalendarProps {
  events?: MockEvent[];
  onSelectEvent?: (event: MockEvent) => void;
  onSelectSlot?: (slot: unknown) => void;
  [key: string]: unknown;
}

// Mock Calendar component
export const Calendar = ({ events, onSelectEvent, onSelectSlot: _onSelectSlot, ...props }: CalendarProps) => {
  return (
    <div data-testid="mock-calendar" {...props}>
      {events && events.map((event: MockEvent, index: number) => (
        <div 
          key={index} 
          data-testid={`event-${index}`}
          onClick={() => onSelectEvent && onSelectEvent(event)}
        >
          {event.title}
        </div>
      ))}
    </div>
  );
};

// Mock momentLocalizer
export const momentLocalizer = () => ({
  formats: {},
  messages: {},
});

// Mock Views
export const Views = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  AGENDA: 'agenda',
};

// Default export
export default { Calendar, momentLocalizer, Views };