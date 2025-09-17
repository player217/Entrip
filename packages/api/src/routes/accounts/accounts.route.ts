import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { accountsController } from './accounts.controller';
import { authMiddleware, requireRole } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { validateBody, validateQuery } from '../../middlewares/validate.middleware';
import { AccountCreateDto } from './dtos/AccountCreate.dto';
import { AccountUpdateDto } from './dtos/AccountUpdate.dto';
import { AccountQueryDto } from './dtos/AccountQuery.dto';

const router: Router = Router();

// Apply auth and multi-tenancy middleware to all routes
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

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
  requireRole([UserRole.ADMIN]),
  validateBody(AccountCreateDto),
  accountsController.create
);

// PUT /accounts/:id - Update account (admin only)
router.put(
  '/:id',
  requireRole([UserRole.ADMIN]),
  validateBody(AccountUpdateDto),
  accountsController.update
);

// DELETE /accounts/:id - Delete account (admin only)
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  accountsController.delete
);

export default router;