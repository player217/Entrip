import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../middlewares/cache.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { apiRateLimit } from '../../middlewares/rateLimit.middleware';
import { NotificationListQueryDto } from './dtos/NotificationListQuery.dto';
import { NotificationReadAllDto } from './dtos/NotificationReadAll.dto';
import { NotificationPreferenceUpdateDto } from './dtos/NotificationPreferenceUpdate.dto';

const router: Router = Router();

// Apply authentication and multi-tenancy to all routes
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

/**
 * Notification Preferences Endpoints (must be before other routes)
 */

// GET /api/v2/notifications/preferences (with caching)
router.get(
  '/preferences',
  cacheMiddleware({ ttl: 300 }), // 5 minutes cache
  notificationsController.getPreferences
);

// PUT /api/v2/notifications/preferences (with validation and cache invalidation)
router.put(
  '/preferences',
  validateBody(NotificationPreferenceUpdateDto as any),
  invalidateCacheMiddleware(['notifications-preferences']),
  notificationsController.updatePreferences
);

/**
 * Notification List Endpoints
 */

// GET /api/v2/notifications/unread-count (must be before /:id route)
router.get(
  '/unread-count',
  cacheMiddleware({ ttl: 30 }), // 30 seconds cache
  notificationsController.getUnreadCount
);

// PATCH /api/v2/notifications/read-all (must be before /:id/read route)
router.patch(
  '/read-all',
  apiRateLimit, // Rate limit for bulk operations
  validateBody(NotificationReadAllDto),
  invalidateCacheMiddleware(['notifications']),
  notificationsController.markAllAsRead
);

// GET /api/v2/notifications (with caching and query validation)
router.get(
  '/',
  validateQuery(NotificationListQueryDto),
  cacheMiddleware({ ttl: 60 }), // 60 seconds cache
  notificationsController.list
);

// GET /api/v2/notifications/:id (with caching)
router.get(
  '/:id',
  cacheMiddleware({ ttl: 120 }), // 2 minutes cache
  notificationsController.getById
);

/**
 * Notification Update Endpoints
 */

// PATCH /api/v2/notifications/:id/read (with cache invalidation)
router.patch(
  '/:id/read',
  invalidateCacheMiddleware(['notifications']),
  notificationsController.markAsRead
);

// DELETE /api/v2/notifications/:id (with cache invalidation)
router.delete(
  '/:id',
  invalidateCacheMiddleware(['notifications']),
  notificationsController.delete
);

export default router;
