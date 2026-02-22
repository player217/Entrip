import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { notificationsService } from './notifications.service';
import { NotificationListQuery, NotificationFilters } from './dtos/NotificationListQuery.dto';
import { NotificationReadAllInput } from './dtos/NotificationReadAll.dto';
import { NotificationPreferenceUpdateInput } from './dtos/NotificationPreferenceUpdate.dto';
import { PaginationOptions } from '../../services/base.service';

/**
 * Notifications Controller
 * Handles HTTP request/response for notification endpoints
 */
export class NotificationsController {
  /**
   * GET /api/v2/notifications
   * List notifications with pagination and filters
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      // Extract query parameters (already validated by middleware)
      const query = req.query as unknown as NotificationListQuery;

      // Build pagination options
      const options: PaginationOptions = {
        page: query.page,
        limit: query.limit,
        orderBy: query.orderBy,
        order: query.order,
      };

      // Build filters
      const filters: NotificationFilters = {
        type: query.type,
        priority: query.priority,
        isRead: query.isRead,
      };

      const result = await notificationsService.findAll(userId, companyCode, filters, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/unread-count
   * Get unread notification count with breakdown
   */
  getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const result = await notificationsService.getUnreadCount(userId, companyCode);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/:id
   * Get notification by ID
   */
  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Notification ID is required',
        });
      }

      const notification = await notificationsService.findById(id, userId, companyCode);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v2/notifications/:id/read
   * Mark notification as read
   */
  markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Notification ID is required',
        });
      }

      const notification = await notificationsService.markAsRead(id, userId, companyCode);

      res.json({
        success: true,
        data: {
          id: notification.id,
          isRead: notification.isRead,
          readAt: notification.readAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v2/notifications/read-all
   * Mark all notifications as read (with optional conditions)
   */
  markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const input = req.body as NotificationReadAllInput;

      // Convert beforeDate string to Date if provided
      const conditions = input.beforeDate
        ? {
            type: input.type,
            priority: input.priority,
            beforeDate: new Date(input.beforeDate),
          }
        : {
            type: input.type,
            priority: input.priority,
          };

      const result = await notificationsService.markAllAsRead(userId, companyCode, conditions);

      res.json({
        success: true,
        data: {
          updatedCount: result.count,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v2/notifications/:id
   * Soft delete notification
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Notification ID is required',
        });
      }

      const notification = await notificationsService.softDelete(id, userId, companyCode);

      res.json({
        success: true,
        data: {
          id: notification.id,
          deletedAt: notification.deletedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v2/notifications/preferences
   * Get user's notification preferences
   */
  getPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const preferences = await notificationsService.getPreferences(userId, companyCode);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v2/notifications/preferences
   * Update user's notification preferences
   */
  updatePreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, companyCode } = req;
      if (!userId || !companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Authentication and company context required',
        });
      }

      const input = req.body as NotificationPreferenceUpdateInput;

      const preferences = await notificationsService.updatePreferences(userId, companyCode, input);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  };
}

// Export singleton instance
export const notificationsController = new NotificationsController();
