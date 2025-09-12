import { Router } from 'express';
import { calendarController } from './calendar.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../../middlewares/validation.middleware';
import { CalendarCreateDto } from './dtos/CalendarCreate.dto';
import { CalendarUpdateDto } from './dtos/CalendarUpdate.dto';
import { CalendarQueryDto } from './dtos/CalendarQuery.dto';
import { CalendarStatusPatchDto } from './dtos/CalendarStatusPatch.dto';

const router: Router = Router();

// All calendar routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/calendar
 * @desc Get calendar events for a specific month
 * @access Private
 */
router.get(
  '/',
  validateQuery(CalendarQueryDto),
  calendarController.list
);

/**
 * @route GET /api/calendar/:id
 * @desc Get a single calendar event by ID
 * @access Private
 */
router.get(
  '/:id',
  calendarController.findById
);

/**
 * @route POST /api/calendar
 * @desc Create a new calendar event
 * @access Private
 */
router.post(
  '/',
  validateBody(CalendarCreateDto),
  calendarController.create
);

/**
 * @route PUT /api/calendar/:id
 * @desc Update a calendar event
 * @access Private
 */
router.put(
  '/:id',
  validateBody(CalendarUpdateDto),
  calendarController.update
);

/**
 * @route PATCH /api/calendar/:id/status
 * @desc Update calendar event status
 * @access Private
 */
router.patch(
  '/:id/status',
  validateBody(CalendarStatusPatchDto),
  calendarController.updateStatus
);

/**
 * @route DELETE /api/calendar/:id
 * @desc Delete a calendar event
 * @access Private
 */
router.delete(
  '/:id',
  calendarController.delete
);

export default router;