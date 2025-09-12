import { Router } from 'express';
import { financeController } from './finance.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { FinanceCreateDto } from './dtos/FinanceCreate.dto';
import { FinanceUpdateDto } from './dtos/FinanceUpdate.dto';
import { FinanceQueryDto } from './dtos/FinanceQuery.dto';
import { FinanceStatsQueryDto } from './dtos/FinanceStatsQuery.dto';
import { FinanceApproveDto } from './dtos/FinanceApprove.dto';

const router: Router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /finance - List finance records with filters
router.get(
  '/',
  validateQuery(FinanceQueryDto),
  financeController.list
);

// GET /finance/stats - Get financial statistics
router.get(
  '/stats',
  validateQuery(FinanceStatsQueryDto),
  financeController.getStats
);

// GET /finance/:id - Get single finance record
router.get(
  '/:id',
  financeController.findById
);

// POST /finance - Create new finance record (admin, staff)
router.post(
  '/',
  requireRole(['admin', 'staff']),
  validateBody(FinanceCreateDto),
  financeController.create
);

// PUT /finance/:id - Update finance record (admin, staff)
router.put(
  '/:id',
  requireRole(['admin', 'staff']),
  validateBody(FinanceUpdateDto),
  financeController.update
);

// DELETE /finance/:id - Delete finance record (admin only)
router.delete(
  '/:id',
  requireRole(['admin']),
  financeController.delete
);

// PATCH /finance/:id/approve - Approve or reject finance record (admin only)
router.patch(
  '/:id/approve',
  requireRole(['admin']),
  validateBody(FinanceApproveDto),
  financeController.approve
);

export default router;