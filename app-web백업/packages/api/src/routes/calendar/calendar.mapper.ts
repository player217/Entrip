import { CalendarEvent } from './calendar.service';

/**
 * Map CalendarEvent to response DTO
 * Ensures all fields are explicitly included in the response
 */
export function mapEventToResponse(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    color: event.color,
    description: event.description,
    location: event.location,
    teamId: event.teamId,
    status: event.status,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedBy: event.updatedBy,
    updatedAt: event.updatedAt,
    deletedAt: event.deletedAt,
  };
}

/**
 * Map array of CalendarEvents to response DTOs
 */
export function mapEventsToResponse(events: CalendarEvent[]) {
  return events.map(mapEventToResponse);
}