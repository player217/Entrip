import { Response, NextFunction } from 'express';
import { accountsService } from './accounts.service';
import { AuthRequest } from '../../types/auth';
import { AccountCreateInput } from './dtos/AccountCreate.dto';
import { AccountUpdateInput } from './dtos/AccountUpdate.dto';
import { AccountQueryInput } from './dtos/AccountQuery.dto';

export class AccountsController {
  /**
   * Get accounts list with pagination and filters
   */
  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as AccountQueryInput;
      const result = await accountsService.list(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single account by ID
   */
  findById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const account = await accountsService.findById(id);

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new account
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const input = req.body as AccountCreateInput;
      const account = await accountsService.create(input);

      res.status(201).json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing account
   */
  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = req.body as AccountUpdateInput;
      const account = await accountsService.update(id, input);

      res.json({
        success: true,
        data: account,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an account (soft delete)
   */
  delete = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await accountsService.delete(id);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const accountsController = new AccountsController();