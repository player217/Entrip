import { calendarService } from '../calendar.service';
import { CalendarCreateInput } from '../dtos/CalendarCreate.dto';
import { CalendarUpdateInput } from '../dtos/CalendarUpdate.dto';
import { ApiError } from '../../../middlewares/error.middleware';

describe('CalendarService', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(async () => {
    // Clear all events before each test
    await calendarService.clearAll();
  });

  describe('create', () => {
    it('should create a new calendar event', async () => {
      const input: CalendarCreateInput = {
        title: 'Team Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
        description: 'Weekly team sync',
        location: 'Conference Room A',
      };

      const event = await calendarService.create(input, mockUser);

      expect(event).toMatchObject({
        title: input.title,
        start: input.start,
        end: input.end,
        allDay: input.allDay,
        description: input.description,
        location: input.location,
        status: 'confirmed',
        createdBy: mockUser.id,
        deletedAt: null,
      });
      expect(event.id).toBeDefined();
      expect(event.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(event.createdAt).toBeDefined();
    });

    it('should use provided color when specified', async () => {
      const input: CalendarCreateInput = {
        title: 'Design Review',
        start: '2024-01-16T14:00:00Z',
        end: '2024-01-16T15:00:00Z',
        allDay: false,
        color: '#FF5733',
      };

      const event = await calendarService.create(input, mockUser);
      expect(event.color).toBe('#FF5733');
    });

    it('should assign random default color when not specified', async () => {
      const input: CalendarCreateInput = {
        title: 'Sprint Planning',
        start: '2024-01-17T09:00:00Z',
        end: '2024-01-17T12:00:00Z',
        allDay: false,
      };

      const event = await calendarService.create(input, mockUser);
      expect(event.color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Create events across different months
      const events = [
        {
          title: 'Jan Event 1',
          start: '2024-01-10T10:00:00Z',
          end: '2024-01-10T11:00:00Z',
          allDay: false,
        },
        {
          title: 'Jan Event 2',
          start: '2024-01-20T14:00:00Z',
          end: '2024-01-20T15:00:00Z',
          allDay: false,
          teamId: 'team-1',
        },
        {
          title: 'Feb Event',
          start: '2024-02-05T09:00:00Z',
          end: '2024-02-05T10:00:00Z',
          allDay: false,
        },
        {
          title: 'Cross Month Event',
          start: '2024-01-31T22:00:00Z',
          end: '2024-02-01T02:00:00Z',
          allDay: false,
        },
      ];

      for (const event of events) {
        await calendarService.create(event, mockUser);
      }
    });

    it('should return events for specific month', async () => {
      const janEvents = await calendarService.list({ year: 2024, month: 1 });
      expect(janEvents).toHaveLength(3); // Jan Event 1, Jan Event 2, Cross Month Event
      expect(janEvents.map(e => e.title)).toContain('Jan Event 1');
      expect(janEvents.map(e => e.title)).toContain('Jan Event 2');
      expect(janEvents.map(e => e.title)).toContain('Cross Month Event');
    });

    it('should filter by team when specified', async () => {
      const teamEvents = await calendarService.list({ 
        year: 2024, 
        month: 1, 
        team: 'team-1' 
      });
      expect(teamEvents).toHaveLength(1);
      expect(teamEvents[0].title).toBe('Jan Event 2');
    });

    it('should return events sorted by start date', async () => {
      const events = await calendarService.list({ year: 2024, month: 1 });
      const startDates = events.map(e => new Date(e.start).getTime());
      expect(startDates).toEqual([...startDates].sort((a, b) => a - b));
    });

    it('should exclude soft-deleted events', async () => {
      const allEvents = await calendarService.getAll();
      const eventToDelete = allEvents[0];
      
      await calendarService.delete(eventToDelete.id);
      
      const events = await calendarService.list({ year: 2024, month: 1 });
      expect(events.map(e => e.id)).not.toContain(eventToDelete.id);
    });
  });

  describe('findById', () => {
    it('should return event by id', async () => {
      const created = await calendarService.create({
        title: 'Test Event',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser);

      const found = await calendarService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should throw 404 if event not found', async () => {
      await expect(calendarService.findById('non-existent-id'))
        .rejects.toThrow(new ApiError(404, 'Event not found'));
    });

    it('should not return soft-deleted events', async () => {
      const created = await calendarService.create({
        title: 'To Delete',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser);

      await calendarService.delete(created.id);

      await expect(calendarService.findById(created.id))
        .rejects.toThrow(new ApiError(404, 'Event not found'));
    });
  });

  describe('update', () => {
    it('should update existing event', async () => {
      const created = await calendarService.create({
        title: 'Original Title',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser);

      // Add small delay to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateInput: CalendarUpdateInput = {
        title: 'Updated Title',
        start: '2024-01-15T11:00:00Z',
        end: '2024-01-15T12:00:00Z',
        allDay: true,
        status: 'pending',
        description: 'Updated description',
      };

      const updated = await calendarService.update(created.id, updateInput, mockUser);

      expect(updated).toMatchObject({
        id: created.id,
        title: updateInput.title,
        start: updateInput.start,
        end: updateInput.end,
        allDay: updateInput.allDay,
        status: updateInput.status,
        description: updateInput.description,
        updatedBy: mockUser.id,
      });
      expect(updated.updatedAt).toBeDefined();
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(created.createdAt).getTime());
    });

    it('should preserve original color if not provided', async () => {
      const created = await calendarService.create({
        title: 'Event with Color',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
        color: '#FF0000',
      }, mockUser);

      const updated = await calendarService.update(created.id, {
        title: 'Updated Title',
        start: created.start,
        end: created.end,
        allDay: false,
      }, mockUser);

      expect(updated.color).toBe('#FF0000');
    });

    it('should throw 404 if event not found', async () => {
      await expect(calendarService.update('non-existent-id', {
        title: 'Update',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser)).rejects.toThrow(new ApiError(404, 'Event not found'));
    });
  });

  describe('delete', () => {
    it('should soft delete event', async () => {
      const created = await calendarService.create({
        title: 'To Delete',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser);

      await calendarService.delete(created.id);

      // Should not be found by findById
      await expect(calendarService.findById(created.id))
        .rejects.toThrow(new ApiError(404, 'Event not found'));

      // Should not appear in list
      const events = await calendarService.list({ year: 2024, month: 1 });
      expect(events.map(e => e.id)).not.toContain(created.id);
    });

    it('should throw 404 if event not found', async () => {
      await expect(calendarService.delete('non-existent-id'))
        .rejects.toThrow(new ApiError(404, 'Event not found'));
    });

    it('should not delete already deleted event', async () => {
      const created = await calendarService.create({
        title: 'Double Delete',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        allDay: false,
      }, mockUser);

      await calendarService.delete(created.id);
      await expect(calendarService.delete(created.id))
        .rejects.toThrow(new ApiError(404, 'Event not found'));
    });
  });

  describe('edge cases', () => {
    it('should handle all-day events correctly', async () => {
      const allDayEvent = await calendarService.create({
        title: 'All Day Event',
        start: '2024-01-15T00:00:00Z',
        end: '2024-01-15T23:59:59Z',
        allDay: true,
      }, mockUser);

      expect(allDayEvent.allDay).toBe(true);
    });

    it('should handle events spanning multiple months', async () => {
      const crossMonthEvent = await calendarService.create({
        title: 'Cross Month',
        start: '2024-01-31T20:00:00Z',
        end: '2024-02-02T10:00:00Z',
        allDay: false,
      }, mockUser);

      // Should appear in January results
      const janEvents = await calendarService.list({ year: 2024, month: 1 });
      expect(janEvents.map(e => e.id)).toContain(crossMonthEvent.id);

      // Should also appear in February results
      const febEvents = await calendarService.list({ year: 2024, month: 2 });
      expect(febEvents.map(e => e.id)).toContain(crossMonthEvent.id);
    });

    it('should handle year boundaries correctly', async () => {
      const yearEndEvent = await calendarService.create({
        title: 'New Year Event',
        start: '2023-12-31T22:00:00Z',
        end: '2024-01-01T02:00:00Z',
        allDay: false,
      }, mockUser);

      const jan2024Events = await calendarService.list({ year: 2024, month: 1 });
      expect(jan2024Events.map(e => e.id)).toContain(yearEndEvent.id);
    });
  });
});