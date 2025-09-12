import { Router } from 'express';
import { accountsController } from './accounts.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { AccountCreateDto } from './dtos/AccountCreate.dto';
import { AccountUpdateDto } from './dtos/AccountUpdate.dto';
import { AccountQueryDto } from './dtos/AccountQuery.dto';

const router: Router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /accounts - List accounts with filters
router.get(
  '/',
  validateQuery(AccountQueryDto),
  accountsController.list
);

// GET /accounts/:id - Get single account
router.get(
  '/:id',
  accountsController.findById
);

// POST /accounts - Create new account (admin only)
router.post(
  '/',
  requireRole(['admin']),
  validateBody(AccountCreateDto),
  accountsController.create
);

// PUT /accounts/:id - Update account (admin only)
router.put(
  '/:id',
  requireRole(['admin']),
  validateBody(AccountUpdateDto),
  accountsController.update
);

// DELETE /accounts/:id - Delete account (admin only)
router.delete(
  '/:id',
  requireRole(['admin']),
  accountsController.delete
);

export default router;