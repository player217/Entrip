import { Router, type Router as ExpressRouter } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { teamBookingsController } from './teamBookings.controller';

const router: ExpressRouter = Router();

// 인증 + 회사 스코프 적용
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

// 목록
router.get('/', teamBookingsController.list);

// 상세
router.get('/:id', teamBookingsController.getById);

// 히스토리
router.get('/:id/history', teamBookingsController.getHistory);

export default router;
