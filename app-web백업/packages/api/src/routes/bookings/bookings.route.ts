import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { BookingCreateDto } from './dtos/BookingCreate.dto';
import { BookingUpdateDto } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchDto } from './dtos/BookingStatusPatch.dto';

const router: Router = Router();

// GET /api/v1/bookings
router.get('/', bookingsController.list);

// GET /api/v1/bookings/:id
router.get('/:id', bookingsController.getById);

// POST /api/v1/bookings
router.post('/', validateBody(BookingCreateDto), bookingsController.create);

// PUT /api/v1/bookings/:id
router.put('/:id', validateBody(BookingUpdateDto), bookingsController.update);

// PATCH /api/v1/bookings/:id/status
router.patch('/:id/status', validateBody(BookingStatusPatchDto), bookingsController.updateStatus);

// DELETE /api/v1/bookings/:id
router.delete('/:id', bookingsController.delete);

export default router;