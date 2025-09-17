import { FinanceRecord, FinanceType, FinanceStatus } from '@prisma/client';
import { BaseService } from '../../services/base.service';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middlewares/error.middleware';
import { FinanceCreateInput } from './dtos/FinanceCreate.dto';
import { FinanceUpdateInput } from './dtos/FinanceUpdate.dto';
import { FinanceQueryInput } from './dtos/FinanceQuery.dto';
import { FinanceApproveInput } from './dtos/FinanceApprove.dto';

export class FinanceService extends BaseService<FinanceRecord> {
  constructor() {
    super(prisma.financeRecord);
  }

  /**
   * List finance records with advanced filtering
   */
  async listFinanceRecords(
    companyCode: string,
    query: FinanceQueryInput
  ) {
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

    const whereClause: any = {
      companyCode,
      deletedAt: null,
    };

    // Apply filters
    if (type) {
      whereClause.type = type as FinanceType;
    }

    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    if (status) {
      whereClause.status = status as FinanceStatus;
    }

    if (accountId) {
      whereClause.accountId = accountId;
    }

    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.occurredAt = {};
      if (dateFrom) {
        whereClause.occurredAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.occurredAt.lte = new Date(dateTo);
      }
    }

    // Amount range filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {};
      if (minAmount !== undefined) {
        whereClause.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        whereClause.amount.lte = maxAmount;
      }
    }

    // Keyword search
    if (keyword) {
      whereClause.OR = [
        {
          category: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const take = limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: {
          occurredAt: 'desc',
        },
        include: {
          account: {
            select: {
              id: true,
              accountName: true,
              accountNumber: true,
            },
          },
        },
      }),
      this.model.count({ where: whereClause }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a finance record with company code
   */
  async createFinanceRecord(
    companyCode: string,
    userId: string,
    input: FinanceCreateInput
  ): Promise<FinanceRecord> {
    const recordData: any = {
      type: input.type as FinanceType,
      category: input.category,
      amount: input.amount,
      currency: input.currency || 'KRW',
      exchangeRate: input.exchangeRate || 1,
      occurredAt: new Date(input.occurredAt),
      description: input.description,
      status: FinanceStatus.pending,
      companyCode,
      createdById: userId,
    };

    // Link to account if provided
    if (input.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: input.accountId,
          companyCode,
          deletedAt: null,
        },
      });

      if (!account) {
        throw new ApiError(404, 'Account not found or access denied');
      }

      recordData.accountId = input.accountId;
    }

    // Link to project (booking) if provided
    if (input.projectId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: input.projectId,
          companyCode,
          deletedAt: null,
        },
      });

      if (!booking) {
        throw new ApiError(404, 'Project not found or access denied');
      }

      recordData.projectId = input.projectId;
    }

    return this.model.create({
      data: recordData,
      include: {
        account: true,
      },
    });
  }

  /**
   * Update finance record with company validation
   */
  async updateFinanceRecord(
    id: string,
    companyCode: string,
    input: FinanceUpdateInput
  ): Promise<FinanceRecord> {
    // First validate the record exists and belongs to company
    const record = await this.findById(id, companyCode);

    // Can't update approved or rejected records
    if (record.status !== FinanceStatus.pending) {
      throw new ApiError(400, `Cannot update ${record.status} records`);
    }

    const updateData: any = {};

    if (input.type) {
      updateData.type = input.type as FinanceType;
    }
    if (input.category) {
      updateData.category = input.category;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount;
    }
    if (input.currency) {
      updateData.currency = input.currency;
    }
    if (input.exchangeRate !== undefined) {
      updateData.exchangeRate = input.exchangeRate;
    }
    if (input.occurredAt) {
      updateData.occurredAt = new Date(input.occurredAt);
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    updateData.updatedAt = new Date();

    return this.model.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
      },
    });
  }

  /**
   * Approve or reject a finance record
   */
  async approveFinanceRecord(
    id: string,
    companyCode: string,
    userId: string,
    input: FinanceApproveInput
  ): Promise<FinanceRecord> {
    // First validate the record exists and belongs to company
    const record = await this.findById(id, companyCode);

    // Can only approve/reject pending records
    if (record.status !== FinanceStatus.pending) {
      throw new ApiError(400, `Cannot update status. Current status is ${record.status}`);
    }

    const updateData: any = {
      status: input.status === 'approved' ? FinanceStatus.approved : FinanceStatus.rejected,
      remarks: input.remarks,
      updatedAt: new Date(),
    };

    if (input.status === 'approved') {
      updateData.approvedById = userId;
      updateData.approvedAt = new Date();
    } else {
      updateData.rejectedById = userId;
      updateData.rejectedAt = new Date();
    }

    return this.model.update({
      where: { id },
      data: updateData,
      include: {
        account: true,
      },
    });
  }

  /**
   * Get financial statistics by month
   */
  async getStatsByMonth(
    companyCode: string,
    year: number,
    month?: number
  ) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);

    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const records = await this.model.findMany({
      where: {
        companyCode,
        deletedAt: null,
        status: {
          in: [FinanceStatus.pending, FinanceStatus.approved],
        },
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, { income: number; expense: number }> = {};

    records.forEach((record: FinanceRecord) => {
      const amount = Number(record.amount) * Number(record.exchangeRate);

      if (record.type === FinanceType.income) {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      if (!byCategory[record.category]) {
        byCategory[record.category] = { income: 0, expense: 0 };
      }

      if (record.type === FinanceType.income) {
        byCategory[record.category].income += amount;
      } else {
        byCategory[record.category].expense += amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      byCategory,
      period: {
        year,
        month: month || 'all',
      },
    };
  }

  /**
   * Get finance record statistics
   */
  async getStats(companyCode: string) {
    const [total, pending, approved, rejected] = await Promise.all([
      this.count(companyCode),
      this.count(companyCode, { status: FinanceStatus.pending }),
      this.count(companyCode, { status: FinanceStatus.approved }),
      this.count(companyCode, { status: FinanceStatus.rejected }),
    ]);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const monthlyStats = await this.getStatsByMonth(
      companyCode,
      currentYear,
      currentMonth
    );

    return {
      total,
      byStatus: {
        pending,
        approved,
        rejected,
      },
      currentMonth: monthlyStats,
    };
  }
}

export const financeService = new FinanceService();