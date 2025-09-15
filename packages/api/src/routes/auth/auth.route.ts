import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { RegisterDto } from './dtos/Register.dto';
import { LoginDto } from './dtos/Login.dto';
import { z } from 'zod';

const router: Router = Router();

// Password update DTO
const UpdatePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Public routes
router.post('/register', validateBody(RegisterDto), authController.register);
router.post('/login', validateBody(LoginDto), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authMiddleware, authController.me);
router.patch('/password', authMiddleware, validateBody(UpdatePasswordDto), authController.updatePassword);

// Admin routes
router.get('/users/:role', authMiddleware, requireAdmin, authController.getUsersByRole);
router.delete('/users/:userId', authMiddleware, requireAdmin, authController.deactivateUser);

export default router;