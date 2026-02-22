import prisma from '../../lib/prisma';
import { Notification, NotificationPreference, NotificationType, NotificationPriority } from '@prisma/client';
import { ApiError } from '../../middlewares/error.middleware';
import { PaginationOptions, PaginatedResult } from '../../services/base.service';
import { NotificationFilters } from './dtos/NotificationListQuery.dto';
import { ReadAllConditions } from './dtos/NotificationReadAll.dto';
import { NotificationPreferenceUpdateInput } from './dtos/NotificationPreferenceUpdate.dto';

/**
 * Result type for unread count endpoint
 */
export interface UnreadCountResult {
  unreadCount: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

/**
 * Notifications Service
 * Handles all notification-related business logic with multi-tenancy support
 */
export class NotificationsService {
  /**
   * Find all notifications for a user with filtering and pagination
   */
  async findAll(
    userId: string,
    companyCode: string,
    filters: NotificationFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Notification>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId,
      companyCode,
      deletedAt: null,
      // Filter out expired notifications
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    };

    // Apply optional filters
    if (filters.type !== undefined) {
      where.type = filters.type;
    }
    if (filters.priority !== undefined) {
      where.priority = filters.priority;
    }
    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    // Execute query with pagination
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [options.orderBy || 'createdAt']: options.order || 'desc'
        }
      }),
      prisma.notification.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get unread notification count with breakdown by priority and type
   */
  async getUnreadCount(userId: string, companyCode: string): Promise<UnreadCountResult> {
    // Get all unread notifications
    const unreadNotifications = await prisma.notification.findMany({
      where: {
        userId,
        companyCode,
        isRead: false,
        deletedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        priority: true,
        type: true
      }
    });

    // Aggregate by priority
    const byPriority: Record<string, number> = {
      URGENT: 0,
      HIGH: 0,
      NORMAL: 0,
      LOW: 0
    };

    // Aggregate by type
    const byType: Record<string, number> = {};

    unreadNotifications.forEach((notification: { priority: string; type: string }) => {
      // Count by priority
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;

      // Count by type
      byType[notification.type] = (byType[notification.type] || 0) + 1;
    });

    return {
      unreadCount: unreadNotifications.length,
      byPriority,
      byType
    };
  }

  /**
   * Find notification by ID with user and company validation
   */
  async findById(id: string, userId: string, companyCode: string): Promise<Notification> {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
        companyCode,
        deletedAt: null
      }
    });

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    return notification;
  }

  /**
   * Mark a notification as read
   * Idempotent operation - safe to call multiple times
   */
  async markAsRead(id: string, userId: string, companyCode: string): Promise<Notification> {
    // Verify notification exists and belongs to user
    await this.findById(id, userId, companyCode);

    // Update to read
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Mark all notifications as read (with optional conditions)
   */
  async markAllAsRead(
    userId: string,
    companyCode: string,
    conditions?: ReadAllConditions
  ): Promise<{ count: number }> {
    // Build where clause
    const where: any = {
      userId,
      companyCode,
      isRead: false,
      deletedAt: null
    };

    // Apply optional conditions
    if (conditions?.type) {
      where.type = conditions.type;
    }
    if (conditions?.priority) {
      where.priority = conditions.priority;
    }
    if (conditions?.beforeDate) {
      where.createdAt = {
        lt: conditions.beforeDate
      };
    }

    // Bulk update
    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { count: result.count };
  }

  /**
   * Soft delete a notification
   */
  async softDelete(id: string, userId: string, companyCode: string): Promise<Notification> {
    // Verify notification exists and belongs to user
    await this.findById(id, userId, companyCode);

    // Soft delete
    const deleted = await prisma.notification.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    return deleted;
  }

  /**
   * Get user's notification preferences
   * Creates default preferences if they don't exist
   */
  async getPreferences(userId: string, companyCode: string): Promise<NotificationPreference> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    // Create default preferences if not found
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          companyCode,
          // Default values are defined in schema
        }
      });
    }

    return preferences;
  }

  /**
   * Update user's notification preferences (upsert)
   */
  async updatePreferences(
    userId: string,
    companyCode: string,
    data: NotificationPreferenceUpdateInput
  ): Promise<NotificationPreference> {
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        companyCode,
        ...data
      }
    });

    return preferences;
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
