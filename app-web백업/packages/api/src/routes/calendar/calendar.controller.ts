import { Response, NextFunction } from 'express';
import { calendarService } from './calendar.service';
import { CalendarCreateInput } from './dtos/CalendarCreate.dto';
import { CalendarUpdateInput } from './dtos/CalendarUpdate.dto';
import { CalendarQueryInput } from './dtos/CalendarQuery.dto';
import { AuthRequest } from '../../types/auth';
import { mapEventToResponse, mapEventsToResponse } from './calendar.mapper';

export class CalendarController {
  /**
   * Get calendar events for a specific month
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as CalendarQueryInput;
      const events = await calendarService.list(query);
      
      res.json({
        success: true,
        data: mapEventsToResponse(events),
        total: events.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single calendar event by ID
   */
  findById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const event = await calendarService.findById(id);
      
      res.json({
        success: true,
        data: mapEventToResponse(event),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new calendar event
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = req.body as CalendarCreateInput;
      const event = await calendarService.create(input, req.user!);
      
      res.status(201).json({
        success: true,
        data: mapEventToResponse(event),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing calendar event
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = req.body as CalendarUpdateInput;
      const event = await calendarService.update(id, input, req.user!);
      
      res.json({
        success: true,
        data: mapEventToResponse(event),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update calendar event status
   */
  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const event = await calendarService.updateStatus(id, status, req.user!);
      
      res.json({
        success: true,
        data: mapEventToResponse(event),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a calendar event
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await calendarService.delete(id);
      
      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const calendarController = new CalendarController();