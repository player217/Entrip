import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { financeService } from './finance.service';
import { FinanceCreateInput } from './dtos/FinanceCreate.dto';
import { FinanceUpdateInput } from './dtos/FinanceUpdate.dto';
import { FinanceQueryInput } from './dtos/FinanceQuery.dto';
import { FinanceApproveInput } from './dtos/FinanceApprove.dto';

export class FinanceController {
  /**
   * Get finance records with filters and pagination
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const query = req.query as unknown as FinanceQueryInput;
      const result = await financeService.listFinanceRecords(companyCode, query);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const record = await financeService.findById(id, companyCode);

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
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const input = req.body as FinanceCreateInput;
      const record = await financeService.createFinanceRecord(companyCode, userId, input);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const input = req.body as FinanceUpdateInput;
      const record = await financeService.updateFinanceRecord(id, companyCode, input);

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
      const { companyCode } = req;
      if (!companyCode) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      await financeService.delete(id, companyCode);

      res.json({
        success: true,
        message: 'Finance record deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get finance statistics
   */
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

      // Query is already validated and transformed
      const { year, month } = req.query as { year?: number; month?: number };

      const yearNum = year || new Date().getFullYear();

      // Get both general stats and monthly stats
      if (month) {
        const monthlyStats = await financeService.getStatsByMonth(
          companyCode,
          yearNum,
          month
        );

        res.json({
          success: true,
          data: monthlyStats,
        });
      } else {
        const stats = await financeService.getStats(companyCode);

        res.json({
          success: true,
          data: stats,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve or reject a finance record
   */
  approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { companyCode, userId } = req;
      if (!companyCode || !userId) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Company context required',
        });
      }

      const { id } = req.params;
      const input = req.body as FinanceApproveInput;

      const updated = await financeService.approveFinanceRecord(
        id,
        companyCode,
        userId,
        input
      );

      res.json({
        success: true,
        data: updated,
        message: `Finance record ${input.status === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const financeController = new FinanceController();