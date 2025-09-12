import { v4 as uuidv4 } from 'uuid';
import { CalendarCreateInput } from './dtos/CalendarCreate.dto';
import { CalendarUpdateInput } from './dtos/CalendarUpdate.dto';
import { CalendarQueryInput } from './dtos/CalendarQuery.dto';
import { ApiError } from '../../middlewares/error.middleware';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  description?: string;
  location?: string;
  teamId?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

// In-memory storage
const events: CalendarEvent[] = [];

// Default colors from design tokens (brand colors)
const DEFAULT_COLORS = [
  '#2563EB', // brand.500 - primary blue
  '#10B981', // success.500 - emerald
  '#F59E0B', // warning.500 - amber
  '#EF4444', // error.500 - red
  '#8B5CF6', // accent.500 - violet
  '#06B6D4', // info.500 - cyan
];

export class CalendarService {
  /**
   * Get events for a specific month
   */
  async list(query: CalendarQueryInput): Promise<CalendarEvent[]> {
    const { year, month, team } = query;
    
    // Create date range for the month in UTC
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month - 1 + 1, 0, 23, 59, 59, 999));
    
    return events.filter(event => {
      // Skip soft-deleted events
      if (event.deletedAt) return false;
      
      // Filter by team if specified
      if (team && event.teamId !== team) return false;
      
      // Check if event overlaps with the month
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return (
        (eventStart >= startOfMonth && eventStart <= endOfMonth) ||
        (eventEnd >= startOfMonth && eventEnd <= endOfMonth) ||
        (eventStart < startOfMonth && eventEnd > endOfMonth)
      );
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  /**
   * Find a single event by ID
   */
  async findById(id: string): Promise<CalendarEvent> {
    const event = events.find(e => e.id === id && !e.deletedAt);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }
    return event;
  }

  /**
   * Create a new calendar event
   */
  async create(input: CalendarCreateInput, user: { id: string; email: string }): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: uuidv4(),
      title: input.title,
      start: input.start,
      end: input.end,
      allDay: input.allDay || false,
      color: input.color || this.getRandomColor(),
      description: input.description,
      location: input.location,
      teamId: input.teamId,
      status: 'confirmed',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    
    events.push(event);
    return event;
  }

  /**
   * Update an existing calendar event
   */
  async update(
    id: string, 
    input: CalendarUpdateInput, 
    user: { id: string; email: string }
  ): Promise<CalendarEvent> {
    const eventIndex = events.findIndex(e => e.id === id && !e.deletedAt);
    if (eventIndex === -1) {
      throw new ApiError(404, 'Event not found');
    }
    
    const updatedEvent: CalendarEvent = {
      ...events[eventIndex],
      title: input.title,
      start: input.start,
      end: input.end,
      allDay: input.allDay || false,
      color: input.color || events[eventIndex].color,
      description: input.description,
      location: input.location,
      teamId: input.teamId,
      status: input.status || 'confirmed',
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };
    
    events[eventIndex] = updatedEvent;
    return updatedEvent;
  }

  /**
   * Update only the status of a calendar event
   */
  async updateStatus(
    id: string, 
    status: 'confirmed' | 'pending' | 'cancelled',
    user: { id: string; email: string }
  ): Promise<CalendarEvent> {
    const eventIndex = events.findIndex(e => e.id === id && !e.deletedAt);
    if (eventIndex === -1) {
      throw new ApiError(404, 'Event not found');
    }
    
    events[eventIndex].status = status;
    events[eventIndex].updatedBy = user.id;
    events[eventIndex].updatedAt = new Date().toISOString();
    
    return events[eventIndex];
  }

  /**
   * Soft delete a calendar event
   */
  async delete(id: string): Promise<void> {
    const eventIndex = events.findIndex(e => e.id === id && !e.deletedAt);
    if (eventIndex === -1) {
      throw new ApiError(404, 'Event not found');
    }
    
    events[eventIndex].deletedAt = new Date().toISOString();
  }

  /**
   * Get a random default color
   */
  private getRandomColor(): string {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  }

  /**
   * Clear all events (for testing)
   */
  async clearAll(): Promise<void> {
    events.length = 0;
  }

  /**
   * Get all events (for testing)
   */
  async getAll(): Promise<CalendarEvent[]> {
    return events.filter(e => !e.deletedAt);
  }
}

// Export singleton instance
export const calendarService = new CalendarService();