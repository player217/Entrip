import { lockRow } from '../../lib/db-dialect';
import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { authMiddleware, requireRole, AuthRequest } from '../../middlewares/auth.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { ApiError } from '../../middlewares/error.middleware';

const router: Router = Router();
const accountBody = z.object({
  accountName: z.string().trim().min(1).max(100),
  bankName: z.string().trim().min(1).max(100),
  accountNumber: z.string().trim().min(1).max(100),
  holderName: z.string().trim().min(1).max(100),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default('KRW'),
  openingBalance: z.number().finite().default(0),
});
router.use(authMiddleware);
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const companyCode = req.user!.companyCode;
    const accounts = await prisma.bankAccount.findMany({
      where: { companyCode, deletedAt: null },
      orderBy: { accountName: 'asc' },
      include: { _count: { select: { records: true } } },
    });
    const totals = await prisma.financeRecord.groupBy({
      by: ['accountId', 'type'],
      where: {
        companyCode,
        deletedAt: null,
        status: 'APPROVED',
        accountId: { in: accounts.map((a) => a.id) },
      },
      _sum: { amount: true },
    });
    res.json({
      success: true,
      data: accounts.map(({ _count, ...account }) => ({
        ...account,
        // Include all history, as the update/delete guards do, even after a soft delete.
        hasTransactions: _count.records > 0,
        balance: totals
          .filter((t) => t.accountId === account.id)
          .reduce(
            (sum, t) =>
              t.type === 'INCOME' ? sum.plus(t._sum.amount ?? 0) : sum.minus(t._sum.amount ?? 0),
            new Prisma.Decimal(account.openingBalance)
          )
          .toString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  validateBody(accountBody),
  async (req: AuthRequest, res, next) => {
    try {
      const data = await prisma.bankAccount.create({
        data: { ...req.body, companyCode: req.user!.companyCode, createdBy: req.user!.id },
      });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.MANAGER]),
  validateBody(accountBody.extend({ expectedUpdatedAt: z.string().datetime().optional() })),
  async (req: AuthRequest, res, next) => {
    try {
      const data = await prisma.$transaction(async (tx) => {
        await lockRow(tx, 'BankAccount', req.params.id);
        const account = await tx.bankAccount.findFirst({
          where: { id: req.params.id, companyCode: req.user!.companyCode, deletedAt: null },
        });
        if (!account) throw new ApiError(404, '계좌를 찾을 수 없습니다.');
        const { expectedUpdatedAt, ...fields } = req.body;
        if (expectedUpdatedAt && account.updatedAt.getTime() !== Date.parse(expectedUpdatedAt))
          throw new ApiError(412, '다른 사용자가 계좌를 수정했습니다. 입력 내용을 확인한 후 취소하고 새로고침해 다시 수정해 주세요.');
        const hasEntries = await tx.financeRecord.count({
          where: { accountId: account.id },
        });
        if (
          hasEntries &&
          (account.currency !== fields.currency ||
            !account.openingBalance.equals(fields.openingBalance))
        )
          throw new ApiError(409, '거래가 등록된 계좌의 통화와 기초잔액은 변경할 수 없습니다.');
        return tx.bankAccount.update({
          where: { id: account.id },
          data: { ...fields, updatedAt: new Date(Math.max(Date.now(), account.updatedAt.getTime() + 1)) },
        });
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);
router.delete('/:id', requireRole([UserRole.ADMIN]), async (req: AuthRequest, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await lockRow(tx, 'BankAccount', req.params.id);
      const account = await tx.bankAccount.findFirst({
        where: { id: req.params.id, companyCode: req.user!.companyCode, deletedAt: null },
      });
      if (!account) throw new ApiError(404, '계좌를 찾을 수 없습니다.');
      if (await tx.financeRecord.count({ where: { accountId: account.id } }))
        throw new ApiError(409, '거래 이력이 있는 계좌는 삭제할 수 없습니다.');
      await tx.bankAccount.update({ where: { id: account.id }, data: { deletedAt: new Date() } });
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
export default router;
