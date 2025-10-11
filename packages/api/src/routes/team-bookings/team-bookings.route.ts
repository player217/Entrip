import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { extractCompanyCode, validateCompanyAccess } from '../../middlewares/multitenancy.middleware';
import { cacheMiddleware } from '../../middlewares/cache.middleware';
import { teamBookingsController } from './teamBookings.controller';

const router = Router();

// 인증 + 회사 스코프 적용
router.use(authMiddleware);
router.use(extractCompanyCode);
router.use(validateCompanyAccess);

// 목록
router.get('/', cacheMiddleware({ ttl: 300 }), teamBookingsController.list);

// 상세
router.get('/:id', cacheMiddleware({ ttl: 600 }), teamBookingsController.getById);

// 히스토리
router.get('/:id/history', cacheMiddleware({ ttl: 120 }), teamBookingsController.getHistory);

export default router;

