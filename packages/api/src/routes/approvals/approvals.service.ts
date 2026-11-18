import { lockRow } from '../../lib/db-dialect';
import { Prisma, ApprovalStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middlewares/error.middleware';
import { ApprovalCreateInput } from './dtos/ApprovalCreate.dto';
import { ApprovalUpdateInput } from './dtos/ApprovalUpdate.dto';
import { ApprovalQueryInput } from './dtos/ApprovalQuery.dto';
import { ApprovalActionInput } from './dtos/ApprovalAction.dto';
import { AuthUser } from '../../types/auth';

const include = {
  steps: {
    orderBy: { order: 'asc' as const },
    include: { approver: { select: { id: true, name: true } } },
  },
  requester: { select: { id: true, name: true } },
};
type StoredApproval = Prisma.ApprovalGetPayload<{ include: typeof include }>;
function present(item: StoredApproval) {
  return {
    ...item,
    targetType: item.targetType === 'PAYMENT' ? 'finance' : 'custom',
    status: item.status.toLowerCase(),
    steps: item.steps.map((step) => ({ ...step, action: step.action?.toLowerCase() })),
  };
}
export class ApprovalsService {
  private async validateSteps(
    tx: Prisma.TransactionClient,
    steps: { approverId: string; order: number }[],
    user: AuthUser
  ) {
    const ids = steps.map((step) => step.approverId);
    if (
      ids.includes(user.id) ||
      new Set(ids).size !== ids.length ||
      new Set(steps.map((s) => s.order)).size !== steps.length
    )
      throw new ApiError(400, '결재자는 중복되거나 요청자 본인일 수 없습니다.');
    const count = await tx.user.count({
      where: {
        id: { in: ids },
        companyCode: user.companyCode,
        isActive: true,
        role: { in: ['ADMIN', 'MANAGER'] },
      },
    });
    if (count !== ids.length)
      throw new ApiError(400, '같은 회사의 활성 관리자 또는 매니저를 선택해 주세요.');
    return [...steps]
      .sort((a, b) => a.order - b.order)
      .map((step, order) => ({ approverId: step.approverId, order }));
  }
  async create(input: ApprovalCreateInput, user: AuthUser) {
    return prisma.$transaction(async (tx) => {
      const steps = await this.validateSteps(tx, input.steps, user);
      let amount = input.amount;
      let currency = input.currency || 'KRW';
      if (input.targetType === 'finance') {
        if (!input.targetId) throw new ApiError(400, '결재할 거래를 선택해 주세요.');
        await lockRow(tx, 'FinanceRecord', input.targetId);
        const record = await tx.financeRecord.findFirst({
          where: { id: input.targetId, companyCode: user.companyCode, deletedAt: null },
        });
        if (!record) throw new ApiError(404, '거래를 찾을 수 없습니다.');
        if (record.status !== 'PENDING')
          throw new ApiError(409, '대기 중인 거래만 결재 요청할 수 있습니다.');
        if (steps.some((step) => step.approverId === record.createdBy))
          throw new ApiError(400, '거래 작성자는 자신의 거래를 결재할 수 없습니다.');
        if (
          await tx.approval.count({
            where: {
              targetId: record.id,
              targetType: 'PAYMENT',
              companyCode: user.companyCode,
              status: 'PENDING',
              deletedAt: null,
            },
          })
        )
          throw new ApiError(409, '이미 결재가 진행 중인 거래입니다.');
        amount = Number(record.amount);
        currency = record.currency;
      }
      const approval = await tx.approval.create({
        data: {
          title: input.title,
          content: input.content,
          targetType: input.targetType === 'finance' ? 'PAYMENT' : 'MISC',
          targetId: input.targetType === 'finance' ? input.targetId : null,
          amount,
          currency,
          requesterId: user.id,
          companyCode: user.companyCode,
          steps: { create: steps },
        },
        include,
      });
      await tx.notification.create({
        data: {
          userId: steps[0].approverId,
          companyCode: user.companyCode,
          type: 'APPROVAL_REQUESTED',
          title: '새 결재 요청',
          message: approval.title,
          data: { approvalId: approval.id },
          linkUrl: '/approval',
        },
      });
      return present(approval);
    });
  }
  async list(query: ApprovalQueryInput, companyCode: string) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.ApprovalWhereInput = {
      companyCode,
      deletedAt: null,
      ...(query.status && { status: query.status.toUpperCase() as ApprovalStatus }),
      ...(query.requesterId && { requesterId: query.requesterId }),
      ...(query.approverId && { steps: { some: { approverId: query.approverId } } }),
    };
    const [data, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approval.count({ where }),
    ]);
    return {
      data: data.map(present),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
  async findById(id: string, companyCode: string) {
    const approval = await prisma.approval.findFirst({
      where: { id, companyCode, deletedAt: null },
      include,
    });
    if (!approval) throw new ApiError(404, '결재 요청을 찾을 수 없습니다.');
    return present(approval);
  }
  async update(id: string, input: ApprovalUpdateInput, user: AuthUser) {
    return prisma.$transaction(async (tx) => {
      await lockRow(tx, 'Approval', id);
      const approval = await tx.approval.findFirst({
        where: { id, companyCode: user.companyCode, deletedAt: null },
        include,
      });
      if (!approval) throw new ApiError(404, '결재 요청을 찾을 수 없습니다.');
      if (approval.requesterId !== user.id && user.role?.toUpperCase() !== 'ADMIN')
        throw new ApiError(403, '요청자만 수정할 수 있습니다.');
      if (approval.status !== 'PENDING' || approval.steps.some((step) => step.action !== null))
        throw new ApiError(409, '결재자가 처리하기 전의 요청만 수정하거나 취소할 수 있습니다.');
      const steps = input.steps
        ? await this.validateSteps(tx, input.steps, { ...user, id: approval.requesterId })
        : undefined;
      if (steps && approval.targetType === 'PAYMENT' && approval.targetId) {
        const finance = await tx.financeRecord.findFirst({
          where: { id: approval.targetId, companyCode: user.companyCode },
        });
        if (finance && steps.some((step) => step.approverId === finance.createdBy))
          throw new ApiError(400, '거래 작성자는 자신의 거래를 결재할 수 없습니다.');
      }
      return present(
        await tx.approval.update({
          where: { id },
          data: {
            title: input.title,
            content: input.content,
            ...(input.status === 'cancelled' && { status: 'CANCELLED' }),
            ...(steps && { steps: { deleteMany: {}, create: steps } }),
          },
          include,
        })
      );
    });
  }
  async action(id: string, input: ApprovalActionInput, user: AuthUser) {
    return prisma.$transaction(async (tx) => {
      // All state transitions take the same row lock, so two clicks cannot advance two steps.
      await lockRow(tx, 'Approval', id);
      const approval = await tx.approval.findFirst({
        where: { id, companyCode: user.companyCode, deletedAt: null },
        include,
      });
      if (!approval) throw new ApiError(404, '결재 요청을 찾을 수 없습니다.');
      if (approval.status !== 'PENDING') throw new ApiError(409, '이미 처리된 결재입니다.');
      if (approval.requesterId === user.id)
        throw new ApiError(403, '자신의 요청은 결재할 수 없습니다.');
      const step = approval.steps[approval.currentStep];
      if (!step || step.approverId !== user.id)
        throw new ApiError(403, '현재 순서의 지정 결재자만 처리할 수 있습니다.');
      if (step.action) throw new ApiError(409, '이미 처리된 결재 단계입니다.');
      const activeUser = await tx.user.findFirst({
        where: {
          id: user.id,
          companyCode: user.companyCode,
          isActive: true,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
      });
      if (!activeUser) throw new ApiError(403, '결재 권한이 없습니다.');
      const currentStep =
        input.action === 'approve' ? approval.currentStep + 1 : approval.currentStep;
      const status =
        input.action === 'reject'
          ? 'REJECTED'
          : currentStep === approval.steps.length
            ? 'APPROVED'
            : 'PENDING';
      if (approval.targetType === 'PAYMENT' && approval.targetId) {
        await lockRow(tx, 'FinanceRecord', approval.targetId);
        const record = await tx.financeRecord.findFirst({
          where: { id: approval.targetId, companyCode: user.companyCode, deletedAt: null },
        });
        if (!record || record.status !== 'PENDING')
          throw new ApiError(409, '연결된 거래가 변경되었습니다.');
        if (record.createdBy === user.id)
          throw new ApiError(403, '자신이 작성한 거래는 결재할 수 없습니다.');
        if (status !== 'PENDING')
          await tx.financeRecord.update({
            where: { id: record.id },
            data: {
              status,
              remarks: input.comment,
              ...(status === 'APPROVED'
                ? { approvedBy: user.id, approvedAt: new Date() }
                : { rejectedBy: user.id, rejectedAt: new Date() }),
            },
          });
      }
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          action: input.action === 'approve' ? 'APPROVE' : 'REJECT',
          comment: input.comment,
          actedAt: new Date(),
        },
      });
      const updated = await tx.approval.update({
        where: { id },
        data: { status, currentStep },
        include,
      });
      await tx.notification.create({
        data: {
          companyCode: user.companyCode,
          userId:
            status === 'PENDING' ? approval.steps[currentStep].approverId : approval.requesterId,
          type:
            status === 'PENDING'
              ? 'APPROVAL_REQUESTED'
              : status === 'APPROVED'
                ? 'APPROVAL_APPROVED'
                : 'APPROVAL_REJECTED',
          title: status === 'PENDING' ? '결재 순서 안내' : '결재 결과',
          message: approval.title,
          data: { approvalId: id },
          linkUrl: '/approval',
        },
      });
      return present(updated);
    });
  }
  async delete(id: string, user: AuthUser) {
    await this.update(id, { status: 'cancelled' }, user);
  }
  async getStats(year: number, month: number | undefined, companyCode: string) {
    const data = await prisma.approval.groupBy({
      by: ['status'],
      where: {
        companyCode,
        deletedAt: null,
        createdAt: {
          gte: new Date(Date.UTC(year, month ? month - 1 : 0, 1)),
          lt: new Date(Date.UTC(month ? year : year + 1, month || 0, 1)),
        },
      },
      _count: true,
    });
    return {
      total: data.reduce((total, row) => total + row._count, 0),
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      ...Object.fromEntries(data.map((row) => [row.status.toLowerCase(), row._count])),
    };
  }
}
export const approvalsService = new ApprovalsService();
