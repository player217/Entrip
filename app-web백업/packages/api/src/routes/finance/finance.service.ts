import { ApiError } from '../../middlewares/error.middleware';
import { FinanceCreateInput } from './dtos/FinanceCreate.dto';
import { FinanceUpdateInput } from './dtos/FinanceUpdate.dto';
import { FinanceQueryInput } from './dtos/FinanceQuery.dto';
import { AuthUser } from '../../types/auth';

// Types
export interface FinanceRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  occurredAt: string;
  description?: string;
  accountId?: string;
  projectId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  createdBy: string;
  createdAt: string;
  updatedAt?: string | Date;
  updatedBy?: string;
  deletedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  remarks?: string;
}

// In-memory storage
const financeRecords: FinanceRecord[] = [];
const recordsById = new Map<string, FinanceRecord>();
let idCounter = 1;

// Service implementation
export class FinanceService {
  async list(query: FinanceQueryInput) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      keyword,
      status,
      accountId,
      projectId,
    } = query;

    // Filter records (exclude soft-deleted unless specifically requested)
    const filtered = financeRecords.filter(record => {
      if (!status && record.deletedAt) return false;
      if (status && record.status !== status) return false;
      if (type && record.type !== type) return false;
      if (category && !record.category.toLowerCase().includes(category.toLowerCase())) return false;
      if (accountId && record.accountId !== accountId) return false;
      if (projectId && record.projectId !== projectId) return false;
      
      // Date filtering
      if (dateFrom && new Date(record.occurredAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(record.occurredAt) > new Date(dateTo)) return false;
      
      // Amount filtering
      if (minAmount !== undefined && record.amount < minAmount) return false;
      if (maxAmount !== undefined && record.amount > maxAmount) return false;
      
      // Keyword search
      if (keyword) {
        const searchTerm = keyword.toLowerCase();
        return (
          record.category.toLowerCase().includes(searchTerm) ||
          (record.description && record.description.toLowerCase().includes(searchTerm))
        );
      }
      
      return true;
    });

    // Sort by occurredAt descending
    filtered.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = filtered.slice(start, end);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    };
  }

  async findById(id: string): Promise<FinanceRecord> {
    const record = recordsById.get(id);
    if (!record || record.deletedAt) {
      throw new ApiError(404, 'Finance record not found');
    }
    return record;
  }

  async create(input: FinanceCreateInput, user: AuthUser): Promise<FinanceRecord> {
    const newRecord: FinanceRecord = {
      id: `fin-${idCounter++}`,
      ...input,
      status: 'pending',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    financeRecords.push(newRecord);
    recordsById.set(newRecord.id, newRecord);

    return newRecord;
  }

  async update(id: string, input: FinanceUpdateInput, _user: AuthUser): Promise<FinanceRecord> {
    const record = await this.findById(id);

    // Update fields
    Object.assign(record, {
      ...input,
      updatedAt: new Date().toISOString(),
    });

    return record;
  }

  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    
    // Soft delete
    record.status = 'deleted';
    record.deletedAt = new Date().toISOString();
  }

  /**
   * Update approval status of a finance record
   */
  async updateApprovalStatus(
    id: string, 
    status: 'approved' | 'rejected',
    user: AuthUser,
    remarks?: string
  ): Promise<FinanceRecord> {
    const record = await this.findById(id);

    if (record.status !== 'pending') {
      throw new Error(`Cannot update status. Current status is ${record.status}`);
    }

    record.status = status;
    record.updatedAt = new Date();
    record.updatedBy = user.id;
    
    if (status === 'approved') {
      record.approvedBy = user.id;
      record.approvedAt = new Date().toISOString();
    } else {
      record.rejectedBy = user.id;
      record.rejectedAt = new Date().toISOString();
    }
    
    if (remarks) {
      record.remarks = remarks;
    }

    return record;
  }

  // Statistics helpers
  async getStatsByMonth(year: number, month?: number): Promise<{
    income: number;
    expense: number;
    balance: number;
    byCategory: Record<string, { income: number; expense: number }>;
  }> {
    const filtered = financeRecords.filter(record => {
      if (record.deletedAt || record.status === 'rejected') return false;
      
      const recordDate = new Date(record.occurredAt);
      if (recordDate.getFullYear() !== year) return false;
      if (month !== undefined && recordDate.getMonth() + 1 !== month) return false;
      
      return true;
    });

    let income = 0;
    let expense = 0;
    const byCategory: Record<string, { income: number; expense: number }> = {};

    filtered.forEach(record => {
      const amount = record.amount * record.exchangeRate;
      
      if (record.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }

      if (!byCategory[record.category]) {
        byCategory[record.category] = { income: 0, expense: 0 };
      }
      
      if (record.type === 'income') {
        byCategory[record.category].income += amount;
      } else {
        byCategory[record.category].expense += amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      byCategory,
    };
  }

  // Utility methods for testing
  async clearAll() {
    financeRecords.length = 0;
    recordsById.clear();
    idCounter = 1;
  }

  async getAll(): Promise<FinanceRecord[]> {
    return [...financeRecords];
  }
}

export const financeService = new FinanceService();