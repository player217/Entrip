import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { RegisterDto } from './dtos/Register.dto';
import { LoginDto } from './dtos/Login.dto';

const router: Router = Router();

// Public routes
router.post('/register', validateBody(RegisterDto), authController.register);
router.post('/login', validateBody(LoginDto), authController.login);
// Note: Don't validate body for refresh since token can come from cookie
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authMiddleware, authController.me);

export default router;