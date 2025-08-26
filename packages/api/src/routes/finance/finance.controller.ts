import { Response, NextFunction } from 'express';
import { financeService } from './finance.service';
import { AuthRequest } from '../../types/auth';
import { FinanceCreateInput } from './dtos/FinanceCreate.dto';
import { FinanceUpdateInput } from './dtos/FinanceUpdate.dto';
import { FinanceQueryInput } from './dtos/FinanceQuery.dto';

export class FinanceController {
  /**
   * Get finance records with filters and pagination
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as FinanceQueryInput;
      const result = await financeService.list(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single finance record by ID
   */
  findById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const record = await financeService.findById(id);

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new finance record
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = req.body as FinanceCreateInput;
      const record = await financeService.create(input, req.user!);

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing finance record
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = req.body as FinanceUpdateInput;
      const record = await financeService.update(id, input, req.user!);

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a finance record (soft delete)
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await financeService.delete(id);

      res.json({
        success: true,
        message: 'Finance record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get finance statistics by month
   */
  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Query is already validated and transformed by FinanceStatsQueryDto
      const { year, month } = req.query as { year?: number; month?: number };
      
      const yearNum = year || new Date().getFullYear();
      const monthNum = month;

      const stats = await financeService.getStatsByMonth(yearNum, monthNum);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve or reject a finance record
   */
  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;

      const updated = await financeService.updateApprovalStatus(
        id, 
        status, 
        req.user!,
        remarks
      );

      res.json({
        success: true,
        data: updated,
        message: `Finance record ${status} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const financeController = new FinanceController();