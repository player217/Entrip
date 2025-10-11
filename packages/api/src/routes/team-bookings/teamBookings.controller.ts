import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { teamBookingsService } from './teamBookings.service';

export class TeamBookingsController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Company context required' });
      }

      const page = parseInt(String(req.query.page ?? req.query.pageNumber ?? 1), 10) || 1;
      const pageSize = parseInt(String(req.query.pageSize ?? req.query.limit ?? 20), 10) || 20;

      const result = await teamBookingsService.list(
        companyCode,
        req.query as Record<string, unknown>,
        { page, limit: pageSize }
      );

      // v2 응답 형태: data + pagination (shared에서 자동 정규화)
      return res.json({
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Company context required' });
      }

      const booking = await teamBookingsService.findById(req.params.id!, companyCode);

      // ETag 헤더 (버전/업데이트 기반)
      try {
        const { makeETag } = await import('../../lib/etag');
        const etag = makeETag([booking.id, (booking as any).version, (booking as any).updatedAt?.toISOString?.()]);
        res.setHeader('ETag', etag);
      } catch {}

      return res.json({ booking });
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Company context required' });
      }

      const items = await teamBookingsService.getHistory(req.params.id!, companyCode);
      return res.json({ history: items });
    } catch (err) {
      next(err);
    }
  };
}

export const teamBookingsController = new TeamBookingsController();

