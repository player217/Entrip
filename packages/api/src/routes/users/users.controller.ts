import { Request, Response, NextFunction } from 'express';
import { userService } from '../../services/user.service';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { ApiError } from '../../middlewares/error.middleware';

export class UsersController {
  /**
   * Get all users with filtering and pagination
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, department, isActive, search, page = 1, limit = 50, sortBy = 'name', sortOrder = 'asc' } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const result = await userService.findAll(req.companyCode!, {
        role: role as any,
        department: department as string,
        isActive: isActive === 'false' ? false : true,
        search: search as string,
        skip,
        take,
        orderBy: { [sortBy as string]: sortOrder },
      });

      res.json({
        data: result.users,
        total: result.total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(result.total / take),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const user = await userService.findById(id, req.companyCode!);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.user!.id, req.companyCode!);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user (Admin only)
   */
  async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'ADMIN') {
        throw new ApiError(403, 'Only admins can create users');
      }

      const userData = {
        ...req.body,
        companyCode: req.companyCode!,
      };

      const user = await userService.create(userData, req.companyCode!);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user information
   */
  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Users can only update their own profile unless they're admin
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        throw new ApiError(403, 'You can only update your own profile');
      }

      const user = await userService.update(id, req.body, req.companyCode!);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Users can only update their own password
      if (req.user!.id !== id) {
        throw new ApiError(403, 'You can only update your own password');
      }

      await userService.updatePassword(id, currentPassword, newPassword, req.companyCode!);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password (Admin only)
   */
  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!req.user?.role) {
        throw new ApiError(401, 'User role not found');
      }
      await userService.resetPassword(id, newPassword, req.companyCode!, req.user.role);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user (Admin only)
   */
  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN') {
        throw new ApiError(403, 'Only admins can deactivate users');
      }

      // Prevent self-deactivation
      if (req.user!.id === id) {
        throw new ApiError(400, 'You cannot deactivate your own account');
      }

      await userService.deactivate(id, req.companyCode!);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate user (Admin only)
   */
  async reactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (req.user!.role !== 'ADMIN') {
        throw new ApiError(403, 'Only admins can reactivate users');
      }

      const user = await userService.reactivate(id, req.companyCode!);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { department } = req.params;

      const users = await userService.findByDepartment(department, req.companyCode!);

      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics (Admin only)
   */
  async getUserStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
        throw new ApiError(403, 'Only admins and managers can view statistics');
      }

      const stats = await userService.getStatistics(req.companyCode!);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk create users (Admin only)
   */
  async bulkCreateUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { users } = req.body;

      if (!Array.isArray(users) || users.length === 0) {
        throw new ApiError(400, 'Invalid users data');
      }

      if (!req.user?.role) {
        throw new ApiError(401, 'User role not found');
      }
      const result = await userService.bulkCreate(users, req.companyCode!, req.user.role);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const usersController = new UsersController();