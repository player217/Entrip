import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../middlewares/cache.middleware';
import { BookingCreateDto } from './dtos/BookingCreate.dto';
import { BookingUpdateDto } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchDto } from './dtos/BookingStatusPatch.dto';

const router: Router = Router();

// GET /api/v2/bookings (with caching)
router.get('/', cacheMiddleware({ ttl: 300 }), bookingsController.list);

// GET /api/v2/bookings/:id (with caching)
router.get('/:id', cacheMiddleware({ ttl: 600 }), bookingsController.getById);

// POST /api/v2/bookings (with cache invalidation)
router.post('/', 
  validateBody(BookingCreateDto), 
  invalidateCacheMiddleware(['bookings']),
  bookingsController.create
);

// PUT /api/v2/bookings/:id (with cache invalidation)
router.put('/:id', 
  validateBody(BookingUpdateDto), 
  invalidateCacheMiddleware(['bookings']),
  bookingsController.update
);

// PATCH /api/v2/bookings/:id/status (with cache invalidation)
router.patch('/:id/status', 
  validateBody(BookingStatusPatchDto), 
  invalidateCacheMiddleware(['bookings']),
  bookingsController.updateStatus
);

// DELETE /api/v2/bookings/:id (with cache invalidation)
router.delete('/:id', 
  invalidateCacheMiddleware(['bookings']),
  bookingsController.delete
);

export default router;