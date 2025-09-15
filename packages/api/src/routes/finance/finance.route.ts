import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { financeController } from './finance.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { FinanceCreateDto } from './dtos/FinanceCreate.dto';
import { FinanceUpdateDto } from './dtos/FinanceUpdate.dto';
import { FinanceQueryDto } from './dtos/FinanceQuery.dto';
import { FinanceStatsQueryDto } from './dtos/FinanceStatsQuery.dto';
import { FinanceApproveDto } from './dtos/FinanceApprove.dto';

const router: Router = Router();

// Apply auth and multi-tenancy middleware to all routes
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

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

// POST /finance - Create new finance record (admin, manager)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  validateBody(FinanceCreateDto),
  financeController.create
);

// PUT /finance/:id - Update finance record (admin, manager)
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  validateBody(FinanceUpdateDto),
  financeController.update
);

// DELETE /finance/:id - Delete finance record (admin only)
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  financeController.delete
);

// PATCH /finance/:id/approve - Approve or reject finance record (admin only)
router.patch(
  '/:id/approve',
  requireRole([UserRole.ADMIN]),
  validateBody(FinanceApproveDto),
  financeController.approve
);

export default router;