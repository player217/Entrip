import { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { BookingCreateInput } from './dtos/BookingCreate.dto';
import { BookingUpdateInput } from './dtos/BookingUpdate.dto';
import { BookingStatusPatchInput } from './dtos/BookingStatusPatch.dto';

export class BookingsController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await bookingsService.findAll(page, limit);
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await bookingsService.findById(req.params.id!);
      
      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: BookingCreateInput = req.body;
      const booking = await bookingsService.create(input);
      
      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: BookingUpdateInput = req.body;
      const booking = await bookingsService.update(req.params.id!, input);
      
      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input: BookingStatusPatchInput = req.body;
      const booking = await bookingsService.updateStatus(req.params.id!, input);
      
      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await bookingsService.delete(req.params.id!);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const bookingsController = new BookingsController();