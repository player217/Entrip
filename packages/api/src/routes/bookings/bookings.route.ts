import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { BookingCreateDto } from './dtos/BookingCreate.dto';
import { BookingUpdateDto } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchDto } from './dtos/BookingStatusPatch.dto';

const router: Router = Router();

// Apply authentication and multi-tenancy to all routes
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

// GET /api/v2/bookings (with caching)
router.get('/', bookingsController.list);

// GET /api/v2/bookings/:id (with caching)
router.get('/:id', bookingsController.getById);

// POST /api/v2/bookings (with cache invalidation)
router.post('/', 
  validateBody(BookingCreateDto), 
  bookingsController.create
);

// PUT /api/v2/bookings/:id (with cache invalidation)
router.put('/:id', 
  validateBody(BookingUpdateDto), 
  bookingsController.update
);

// PATCH /api/v2/bookings/:id/status (with cache invalidation)
router.patch('/:id/status', 
  validateBody(BookingStatusPatchDto), 
  bookingsController.updateStatus
);

// DELETE /api/v2/bookings/:id (with cache invalidation)
router.delete('/:id', 
  bookingsController.delete
);

export default router;
