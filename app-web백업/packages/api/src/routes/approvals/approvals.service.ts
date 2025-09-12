import { ApiError } from '../../middlewares/error.middleware';
import { ApprovalCreateInput } from './dtos/ApprovalCreate.dto';
import { ApprovalUpdateInput } from './dtos/ApprovalUpdate.dto';
import { ApprovalQueryInput } from './dtos/ApprovalQuery.dto';
import { ApprovalActionInput } from './dtos/ApprovalAction.dto';
import { AuthUser } from '../../types/auth';
import { financeService } from '../finance/finance.service';
import { sendApprovalResult } from '../../services/notifications.service';

// Types
export interface ApprovalStep {
  approverId: string;
  order: number;
  action?: 'approve' | 'reject';
  comment?: string;
  actedAt?: string;
}

export interface Approval {
  id: string;
  title: string;
  content: string;
  targetType: 'finance' | 'custom';
  targetId?: string;
  amount?: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  steps: ApprovalStep[];
  requesterId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

// In-memory storage
const approvals: Approval[] = [];
const approvalsById = new Map<string, Approval>();
let idCounter = 1;

// Service implementation
export class ApprovalsService {
  async create(input: ApprovalCreateInput, user: AuthUser): Promise<Approval> {
    // Validate finance target if specified
    if (input.targetType === 'finance' && input.targetId) {
      try {
        const financeRecord = await financeService.findById(input.targetId);
        // Sync amount and currency from finance record
        input.amount = financeRecord.amount;
        input.currency = financeRecord.currency;
      } catch (error) {
        throw new ApiError(404, 'Invalid finance record ID');
      }
    }

    // Create approval request
    const approval: Approval = {
      id: `appr-${idCounter++}`,
      title: input.title,
      content: input.content,
      targetType: input.targetType,
      targetId: input.targetId,
      amount: input.amount,
      currency: input.currency || 'KRW',
      status: 'pending',
      currentStep: 0,
      steps: input.steps.map(step => ({
        approverId: step.approverId,
        order: step.order,
      })).sort((a, b) => a.order - b.order),
      requesterId: user.id,
      createdAt: new Date().toISOString(),
    };

    approvals.push(approval);
    approvalsById.set(approval.id, approval);

    return approval;
  }

  async list(query: ApprovalQueryInput): Promise<{
    data: Approval[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 20, status, requesterId, approverId } = query;

    // Filter approvals
    const filtered = approvals.filter(approval => {
      if (approval.deletedAt) return false;
      if (status && approval.status !== status) return false;
      if (requesterId && approval.requesterId !== requesterId) return false;
      if (approverId) {
        const hasApprover = approval.steps.some(step => step.approverId === approverId);
        if (!hasApprover) return false;
      }
      return true;
    });

    // Pagination
    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = filtered.slice(start, end);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  async findById(id: string): Promise<Approval> {
    const approval = approvalsById.get(id);
    
    if (!approval || approval.deletedAt) {
      throw new ApiError(404, 'Approval not found');
    }

    return approval;
  }

  async update(id: string, input: ApprovalUpdateInput, user: AuthUser): Promise<Approval> {
    const approval = await this.findById(id);

    // Only allow updates on pending approvals
    if (approval.status !== 'pending') {
      throw new ApiError(400, 'Cannot update non-pending approval');
    }

    // Update allowed fields
    if (input.title !== undefined) approval.title = input.title;
    if (input.content !== undefined) approval.content = input.content;
    
    if (input.steps !== undefined) {
      // Check if current step is being modified (requires admin)
      const currentApprover = approval.steps[approval.currentStep];
      const newSteps = input.steps.sort((a, b) => a.order - b.order);
      
      if (user.role !== 'admin' && currentApprover && 
          newSteps[approval.currentStep]?.approverId !== currentApprover.approverId) {
        throw new ApiError(403, 'Cannot modify current approval step without admin role');
      }
      
      approval.steps = newSteps.map(step => ({
        approverId: step.approverId,
        order: step.order,
      }));
    }

    if (input.status === 'cancelled') {
      approval.status = 'cancelled';
    }

    approval.updatedAt = new Date().toISOString();

    return approval;
  }

  async action(id: string, input: ApprovalActionInput, user: AuthUser): Promise<Approval> {
    const approval = await this.findById(id);

    // Validate approval status
    if (approval.status !== 'pending') {
      throw new ApiError(409, `Cannot ${input.action} ${approval.status} approval`);
    }

    // Check if user is the requester
    if (approval.requesterId === user.id) {
      throw new ApiError(403, 'Requester cannot approve their own request');
    }

    // Get current step
    const currentStep = approval.steps[approval.currentStep];
    if (!currentStep) {
      throw new ApiError(400, 'No more approval steps');
    }

    // Check if user is the current approver or admin
    if (currentStep.approverId !== user.id && user.role !== 'admin') {
      throw new ApiError(403, 'Not authorized to approve at this step');
    }

    // Check if already acted
    if (currentStep.action) {
      throw new ApiError(409, 'This step has already been acted upon');
    }

    // Record action
    currentStep.action = input.action;
    currentStep.comment = input.comment;
    currentStep.actedAt = new Date().toISOString();

    if (input.action === 'reject') {
      // Rejection ends the approval process
      approval.status = 'rejected';
      
      // Send notification
      await sendApprovalResult({
        approvalId: approval.id,
        result: 'rejected',
        to: [approval.requesterId],
        message: `Your approval request "${approval.title}" has been rejected by ${user.id}`,
      });
    } else {
      // Move to next step
      approval.currentStep++;
      
      if (approval.currentStep >= approval.steps.length) {
        // All steps approved
        approval.status = 'approved';
        
        // Send notification
        await sendApprovalResult({
          approvalId: approval.id,
          result: 'approved',
          to: [approval.requesterId],
          message: `Your approval request "${approval.title}" has been approved`,
        });
      }
    }

    approval.updatedAt = new Date().toISOString();

    return approval;
  }

  async delete(id: string): Promise<void> {
    const approval = await this.findById(id);
    
    // Soft delete
    approval.deletedAt = new Date().toISOString();
  }

  async getStats(year: number, month?: number): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    avgApprovalTime: number; // in hours
  }> {
    const filtered = approvals.filter(approval => {
      if (approval.deletedAt) return false;
      
      const createdDate = new Date(approval.createdAt);
      if (createdDate.getFullYear() !== year) return false;
      if (month !== undefined && createdDate.getMonth() + 1 !== month) return false;
      
      return true;
    });

    // Calculate statistics
    let totalApprovalTime = 0;
    let approvedCount = 0;

    const stats = {
      total: filtered.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      avgApprovalTime: 0,
    };

    filtered.forEach(approval => {
      stats[approval.status]++;
      
      if (approval.status === 'approved') {
        // Calculate approval time
        const created = new Date(approval.createdAt);
        const lastStep = approval.steps[approval.steps.length - 1];
        if (lastStep.actedAt) {
          const acted = new Date(lastStep.actedAt);
          const timeDiff = acted.getTime() - created.getTime();
          totalApprovalTime += timeDiff;
          approvedCount++;
        }
      }
    });

    // Calculate average approval time in hours
    if (approvedCount > 0) {
      stats.avgApprovalTime = Math.round(totalApprovalTime / approvedCount / (1000 * 60 * 60));
    }

    return stats;
  }

  // Helper method for testing
  async clearAll(): Promise<void> {
    approvals.length = 0;
    approvalsById.clear();
    idCounter = 1;
  }
}

export const approvalsService = new ApprovalsService();