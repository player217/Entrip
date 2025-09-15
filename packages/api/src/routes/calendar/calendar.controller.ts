import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { calendarService } from './calendar.service';
import { CalendarCreateInput } from './dtos/CalendarCreate.dto';
import { CalendarUpdateInput } from './dtos/CalendarUpdate.dto';
import { CalendarQueryInput } from './dtos/CalendarQuery.dto';
import { CalendarStatusPatchInput } from './dtos/CalendarStatusPatch.dto';
import { mapEventToResponse, mapEventsToResponse } from './calendar.mapper';

export class CalendarController {
  /**
   * Get calendar events for a specific month
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const query = req.query as unknown as CalendarQueryInput;
      const events = await calendarService.list(companyCode, query);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const event = await calendarService.findById(id, companyCode);

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
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const input = req.body as CalendarCreateInput;
      const event = await calendarService.createEvent(companyCode, userId, input);

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
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const input = req.body as CalendarUpdateInput;
      const event = await calendarService.updateEvent(id, companyCode, userId, input);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const input = req.body as CalendarStatusPatchInput;
      const event = await calendarService.updateEventStatus(id, companyCode, input);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      await calendarService.delete(id, companyCode);

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get calendar statistics
   */
  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const stats = await calendarService.getStats(companyCode);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const calendarController = new CalendarController();