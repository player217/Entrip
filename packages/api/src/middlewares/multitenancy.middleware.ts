import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error.middleware';
import { AuthRequest } from './auth.middleware';

// Extend Express Request to include companyCode and userId
declare global {
  namespace Express {
    interface Request {
      companyCode?: string;
      userId?: string;
    }
  }
}

/**
 * Extract company code from authenticated user
 * This middleware should be used after auth middleware
 */
export const extractCompanyCode = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Extract from JWT payload
    req.companyCode = req.user.companyCode;
    req.userId = req.user.id;

    if (!req.companyCode) {
      throw new ApiError(403, 'Company code not found in token');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate that the requested resource belongs to user's company
 * This is a generic validator - specific validation happens in services
 */
export const validateCompanyAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.companyCode) {
      throw new ApiError(401, 'Authentication and company context required');
    }

    // If resource ID is in params and we need to validate ownership,
    // that should be done in the service layer with database checks
    // This middleware just ensures company context is present

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Ensure all responses only contain data from user's company
 * This is a safety net middleware that can filter response data
 */
export const filterCompanyData = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;

  res.json = function(data: any) {
    // If data contains array of items with companyCode, filter them
    if (data?.data && Array.isArray(data.data)) {
      data.data = data.data.filter((item: any) =>
        !item.companyCode || item.companyCode === req.companyCode
      );
    }

    // If single item with wrong companyCode, return 404
    if (data?.data?.companyCode && data.data.companyCode !== req.companyCode) {
      return originalJson.call(this, {
        success: false,
        error: 'NOT_FOUND',
        message: 'Resource not found'
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Combined middleware for multi-tenancy
 * Use this for all protected routes that need company isolation
 */
export const withMultiTenancy = [
  extractCompanyCode,
  validateCompanyAccess
];