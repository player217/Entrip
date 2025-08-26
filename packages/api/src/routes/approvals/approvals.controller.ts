import { Response, NextFunction } from 'express';
import { approvalsService } from './approvals.service';
import { AuthRequest } from '../../types/auth';
import { ApprovalCreateInput } from './dtos/ApprovalCreate.dto';
import { ApprovalUpdateInput } from './dtos/ApprovalUpdate.dto';
import { ApprovalActionInput } from './dtos/ApprovalAction.dto';
import { ApprovalQueryInput } from './dtos/ApprovalQuery.dto';

export class ApprovalsController {
  /**
   * List approvals with filters
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ApprovalQueryInput;
      const result = await approvalsService.list(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get approval by ID
   */
  findById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const approval = await approvalsService.findById(id);

      res.json({
        success: true,
        data: approval,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new approval request
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input: ApprovalCreateInput = req.body;
      const approval = await approvalsService.create(input, req.user!);

      res.status(201).json({
        success: true,
        data: approval,
        message: 'Approval request created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update approval (admin only)
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input: ApprovalUpdateInput = req.body;
      const approval = await approvalsService.update(id, input, req.user!);

      res.json({
        success: true,
        data: approval,
        message: 'Approval updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Approve or reject (approver/admin only)
   */
  action = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input: ApprovalActionInput = req.body;
      const approval = await approvalsService.action(id, input, req.user!);

      res.json({
        success: true,
        data: approval,
        message: `Approval ${input.action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete approval (admin only)
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await approvalsService.delete(id);

      res.json({
        success: true,
        message: 'Approval deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get approval statistics
   */
  getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { year, month } = req.query;
      
      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : undefined;

      const stats = await approvalsService.getStats(yearNum, monthNum);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const approvalsController = new ApprovalsController();