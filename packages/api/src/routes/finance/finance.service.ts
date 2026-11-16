import { FinanceRecord, Prisma, FinanceStatus, FinanceType } from '@prisma/client';
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
  async listFinanceRecords(companyCode: string, query: FinanceQueryInput) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.FinanceRecordWhereInput = {
      companyCode,
      deletedAt: null,
      ...(query.type && { type: query.type.toUpperCase() as FinanceType }),
      ...(query.status && { status: query.status.toUpperCase() as FinanceStatus }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.category && { category: { contains: query.category, mode: 'insensitive' } }),
      ...((query.dateFrom || query.dateTo) && {
        occurredAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
      ...((query.minAmount !== undefined || query.maxAmount !== undefined) && {
        amount: {
          ...(query.minAmount !== undefined && { gte: query.minAmount }),
          ...(query.maxAmount !== undefined && { lte: query.maxAmount }),
        },
      }),
      ...(query.keyword && {
        OR: [
          { category: { contains: query.keyword, mode: 'insensitive' } },
          { description: { contains: query.keyword, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.financeRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        include: { account: true },
      }),
      prisma.financeRecord.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
  private async validateLinks(
    tx: Prisma.TransactionClient,
    companyCode: string,
    input: { accountId?: string | null; projectId?: string | null; currency: string }
  ) {
    if (input.accountId) {
      await tx.$queryRaw`SELECT id FROM "BankAccount" WHERE id = ${input.accountId} FOR UPDATE`;
      const account = await tx.bankAccount.findFirst({
        where: { id: input.accountId, companyCode, deletedAt: null },
      });
      if (!account) throw new ApiError(404, '계좌를 찾을 수 없습니다.');
      if (account.currency !== input.currency)
        throw new ApiError(400, '거래 통화는 계좌 통화와 같아야 합니다.');
    }
    if (
      input.projectId &&
      !(await tx.booking.findFirst({
        where: { id: input.projectId, companyCode, deletedAt: null },
      }))
    )
      throw new ApiError(404, '예약을 찾을 수 없습니다.');
  }
  async createFinanceRecord(companyCode: string, userId: string, input: FinanceCreateInput) {
    return prisma.$transaction(async (tx) => {
      await this.validateLinks(tx, companyCode, input);
      return tx.financeRecord.create({
        data: {
          ...input,
          type: input.type.toUpperCase() as FinanceType,
          occurredAt: new Date(input.occurredAt),
          companyCode,
          createdBy: userId,
          status: 'PENDING',
        },
        include: { account: true },
      });
    });
  }
  async updateFinanceRecord(
    id: string,
    companyCode: string,
    input: FinanceUpdateInput,
    userId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FinanceRecord" WHERE id = ${id} FOR UPDATE`;
      const record = await tx.financeRecord.findFirst({
        where: { id, companyCode, deletedAt: null },
      });
      if (!record) throw new ApiError(404, '거래를 찾을 수 없습니다.');
      if (record.status !== 'PENDING')
        throw new ApiError(409, '대기 중인 거래만 수정할 수 있습니다.');
      if (
        await tx.approval.count({
          where: {
            companyCode,
            targetType: 'PAYMENT',
            targetId: id,
            status: { in: ['PENDING', 'APPROVED'] },
            deletedAt: null,
          },
        })
      )
        throw new ApiError(409, '결재 요청을 먼저 취소해 주세요.');
      await this.validateLinks(tx, companyCode, {
        accountId: input.accountId === undefined ? record.accountId : input.accountId,
        projectId: input.projectId === undefined ? record.projectId : input.projectId,
        currency: input.currency || record.currency,
      });
      const { status, type, occurredAt, ...fields } = input;
      if (status !== undefined && status !== 'pending')
        throw new ApiError(400, '승인 및 반려는 결재 기능을 이용해 주세요.');
      return tx.financeRecord.update({
        where: { id },
        data: {
          ...fields,
          ...(type && { type: type.toUpperCase() as FinanceType }),
          ...(occurredAt && { occurredAt: new Date(occurredAt) }),
          updatedBy: userId,
        },
        include: { account: true },
      });
    });
  }
  async approveFinanceRecord(
    id: string,
    companyCode: string,
    userId: string,
    input: FinanceApproveInput
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FinanceRecord" WHERE id = ${id} FOR UPDATE`;
      const record = await tx.financeRecord.findFirst({
        where: { id, companyCode, deletedAt: null },
      });
      if (!record) throw new ApiError(404, '거래를 찾을 수 없습니다.');
      if (record.createdBy === userId)
        throw new ApiError(403, '본인이 등록한 거래는 승인할 수 없습니다.');
      if (record.status !== 'PENDING') throw new ApiError(409, '이미 처리된 거래입니다.');
      if (
        await tx.approval.count({
          where: {
            companyCode,
            targetType: 'PAYMENT',
            targetId: id,
            status: 'PENDING',
            deletedAt: null,
          },
        })
      )
        throw new ApiError(409, '진행 중인 결재선에서 처리해 주세요.');
      return tx.financeRecord.update({
        where: { id },
        data: {
          status: input.status === 'approved' ? 'APPROVED' : 'REJECTED',
          remarks: input.remarks,
          ...(input.status === 'approved'
            ? { approvedBy: userId, approvedAt: new Date() }
            : { rejectedBy: userId, rejectedAt: new Date() }),
        },
        include: { account: true },
      });
    });
  }
  async delete(id: string, companyCode: string) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FinanceRecord" WHERE id = ${id} FOR UPDATE`;
      const record = await tx.financeRecord.findFirst({
        where: { id, companyCode, deletedAt: null },
      });
      if (!record) throw new ApiError(404, '거래를 찾을 수 없습니다.');
      if (record.status !== 'PENDING')
        throw new ApiError(409, '처리된 거래의 이력은 삭제할 수 없습니다.');
      if (
        await tx.approval.count({
          where: {
            companyCode,
            targetType: 'PAYMENT',
            targetId: id,
            status: 'PENDING',
            deletedAt: null,
          },
        })
      )
        throw new ApiError(409, '결재 요청을 먼저 취소해 주세요.');
      await tx.financeRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    });
  }
  async getStatsByMonth(companyCode: string, year: number, month?: number) {
    const records = await prisma.financeRecord.findMany({
      where: {
        companyCode,
        deletedAt: null,
        status: 'APPROVED',
        occurredAt: {
          gte: new Date(Date.UTC(year, month ? month - 1 : 0, 1)),
          lt: new Date(Date.UTC(month ? year : year + 1, month || 0, 1)),
        },
      },
    });
    const totals: Record<string, { income: Prisma.Decimal; expense: Prisma.Decimal }> = {};
    for (const record of records) {
      const bucket = (totals[record.currency] ||= {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      });
      const type = record.type === 'INCOME' ? 'income' : 'expense';
      bucket[type] = bucket[type].plus(record.amount);
    }
    const byCurrency = Object.fromEntries(
      Object.entries(totals).map(([currency, amounts]) => [
        currency,
        {
          income: amounts.income.toNumber(),
          expense: amounts.expense.toNumber(),
          balance: amounts.income.minus(amounts.expense).toNumber(),
        },
      ])
    );
    return { byCurrency, period: { year, month: month || 'all' }, basis: 'APPROVED' };
  }
  async getStats(companyCode: string) {
    const statuses = await prisma.financeRecord.groupBy({
      by: ['status'],
      where: { companyCode, deletedAt: null },
      _count: true,
    });
    return {
      total: statuses.reduce((sum, item) => sum + item._count, 0),
      byStatus: Object.fromEntries(
        statuses.map((item) => [item.status.toLowerCase(), item._count])
      ),
      currentMonth: await this.getStatsByMonth(
        companyCode,
        new Date().getFullYear(),
        new Date().getMonth() + 1
      ),
    };
  }
}
export const financeService = new FinanceService();
