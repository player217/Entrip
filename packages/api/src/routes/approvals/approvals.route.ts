import { Router } from 'express';
import { approvalsController } from './approvals.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { ApprovalCreateDto } from './dtos/ApprovalCreate.dto';
import { ApprovalUpdateDto } from './dtos/ApprovalUpdate.dto';
import { ApprovalActionDto } from './dtos/ApprovalAction.dto';
import { ApprovalQueryDto } from './dtos/ApprovalQuery.dto';

const router: Router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /approvals - List approvals with filters
router.get(
  '/',
  validateQuery(ApprovalQueryDto),
  approvalsController.list
);

// GET /approvals/stats - Get approval statistics
router.get(
  '/stats',
  approvalsController.getStats
);

// GET /approvals/:id - Get single approval
router.get(
  '/:id',
  approvalsController.findById
);

// POST /approvals - Create new approval request (staff and above)
router.post(
  '/',
  requireRole(['admin', 'approver', 'staff']),
  validateBody(ApprovalCreateDto),
  approvalsController.create
);

// PUT /approvals/:id - Update approval (admin only)
router.put(
  '/:id',
  requireRole(['admin']),
  validateBody(ApprovalUpdateDto),
  approvalsController.update
);

// POST /approvals/:id/action - Approve or reject (approver, admin)
router.post(
  '/:id/action',
  requireRole(['approver', 'admin']),
  validateBody(ApprovalActionDto),
  approvalsController.action
);

// DELETE /approvals/:id - Delete approval (admin only)
router.delete(
  '/:id',
  requireRole(['admin']),
  approvalsController.delete
);

export default router;