import { Router, type Express } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { extractCompanyCode } from '../../middlewares/multitenancy.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createUserSchema,
  updateUserSchema,
  updatePasswordSchema,
  resetPasswordSchema,
  getUsersQuerySchema,
  getUserByIdSchema,
  getUsersByDepartmentSchema,
  bulkCreateUsersSchema,
} from './users.dto';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(extractCompanyCode);

// Routes

// User profile
router.get('/profile', usersController.getProfile.bind(usersController));

// User statistics (Admin/Manager only)
router.get('/statistics', usersController.getUserStatistics.bind(usersController));

// Get all users with filtering and pagination
router.get('/', validate(getUsersQuerySchema), usersController.getUsers.bind(usersController));

// Get user by ID
router.get('/:id', validate(getUserByIdSchema), usersController.getUserById.bind(usersController));

// Get users by department
router.get(
  '/department/:department',
  validate(getUsersByDepartmentSchema),
  usersController.getUsersByDepartment.bind(usersController)
);

// Create new user (Admin only)
router.post('/', validate(createUserSchema), usersController.createUser.bind(usersController));

// Bulk create users (Admin only)
router.post('/bulk', validate(bulkCreateUsersSchema), usersController.bulkCreateUsers.bind(usersController));

// Update user
router.put('/:id', validate(updateUserSchema), usersController.updateUser.bind(usersController));

// Update password
router.put('/:id/password', validate(updatePasswordSchema), usersController.updatePassword.bind(usersController));

// Reset password (Admin only)
router.post('/:id/reset-password', validate(resetPasswordSchema), usersController.resetPassword.bind(usersController));

// Deactivate user (Admin only)
router.delete('/:id', validate(getUserByIdSchema), usersController.deactivateUser.bind(usersController));

// Reactivate user (Admin only)
router.post('/:id/reactivate', validate(getUserByIdSchema), usersController.reactivateUser.bind(usersController));

export default router;