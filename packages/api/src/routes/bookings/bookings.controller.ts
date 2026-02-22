import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { bookingsService } from './bookings.service';
import { BookingCreateInput } from './dtos/BookingCreate.dto';
import { BookingUpdateInput } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchInput } from './dtos/BookingStatusPatch.dto';
import { PaginationOptions } from '../../services/base.service';

export class BookingsController {
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const options: PaginationOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        orderBy: (req.query.orderBy as string) || 'createdAt',
        order: (req.query.order as 'asc' | 'desc') || 'desc',
      };

      // Extract filters from query params
      const filters: any = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.teamName) {
        filters.teamName = {
          contains: req.query.teamName as string,
          mode: 'insensitive',
        };
      }
      if (req.query.customerName) {
        filters.customerName = {
          contains: req.query.customerName as string,
          mode: 'insensitive',
        };
      }

      const result = await bookingsService.findAll(companyCode, filters, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const booking = await bookingsService.findById(req.params.id!, companyCode);

      // Emit weak ETag based on version and updatedAt
      try {
        const { makeETag } = await import('../../lib/etag');
        const etag = makeETag([booking.id, (booking as any).version, (booking as any).updatedAt?.toISOString?.()]);
        res.setHeader('ETag', etag);
      } catch {
        // ignore ETag errors
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const input: BookingCreateInput = req.body;
      const booking = await bookingsService.createBooking(companyCode, userId, input);

      // Broadcast WS event
      try {
        const { broadcastBookingUpdateForCompany } = await import('../../ws');
        broadcastBookingUpdateForCompany(companyCode, 'create', booking.id, { bookingNumber: (booking as any).bookingNumber });
      } catch (_) {}

      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      // Require If-Match for optimistic locking
      const ifMatch = req.headers['if-match'] as string | undefined;
      const input: BookingUpdateInput = req.body;
      const booking = await bookingsService.updateBooking(req.params.id!, companyCode, input, ifMatch);

      try {
        const { broadcastBookingUpdateForCompany } = await import('../../ws');
        broadcastBookingUpdateForCompany(companyCode, 'update', booking.id);
      } catch (_) {}

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const input: BookingStatusPatchInput = req.body;
      const booking = await bookingsService.updateBookingStatus(req.params.id!, companyCode, input);

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const ifMatch = req.headers['if-match'] as string | undefined;
      await bookingsService.deleteWithLock(req.params.id!, companyCode, ifMatch);

      try {
        const { broadcastBookingUpdateForCompany } = await import('../../ws');
        broadcastBookingUpdateForCompany(companyCode, 'delete', req.params.id!);
      } catch (_) {}

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Additional endpoints
  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const stats = await bookingsService.getStats(companyCode);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  search = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Search query required',
        });
      }

      const bookings = await bookingsService.search(companyCode, query);

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingsController = new BookingsController();
