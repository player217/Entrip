import { containsText } from '../../lib/db-dialect';
import { Account as AccountRecord, AccountRole, AccountStatus, Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middlewares/error.middleware';
import { AccountCreateInput } from './dtos/AccountCreate.dto';
import { AccountUpdateInput } from './dtos/AccountUpdate.dto';
import { AccountQueryInput } from './dtos/AccountQuery.dto';

export interface Account {
  id: string; name: string; email: string; phone?: string;
  role: 'admin' | 'approver' | 'staff' | 'viewer';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string; updatedAt?: string; deletedAt?: string;
}
const roles = { admin: AccountRole.ADMIN, approver: AccountRole.APPROVER, staff: AccountRole.STAFF, viewer: AccountRole.VIEWER };
const statuses = { active: AccountStatus.ACTIVE, suspended: AccountStatus.SUSPENDED, deleted: AccountStatus.DELETED };
const toDto = (row: AccountRecord): Account => ({
  id: row.id, name: row.name, email: row.email, ...(row.phone ? { phone: row.phone } : {}),
  role: row.role.toLowerCase() as Account['role'], status: row.status.toLowerCase() as Account['status'],
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), ...(row.deletedAt ? { deletedAt: row.deletedAt.toISOString() } : {}),
});

/** Legacy employee records. Login identities use User; bank details use BankAccount. */
export class AccountsService {
  private scope(companyCode?: string) {
    if (!companyCode) throw new ApiError(401, 'Company identity is required');
    return companyCode;
  }
  async list(query: AccountQueryInput, companyCode?: string) {
    const { page = 1, limit = 20, status, role, keyword } = query;
    const where: Prisma.AccountWhereInput = {
      companyCode: this.scope(companyCode),
      ...(status ? { status: statuses[status] } : { deletedAt: null }),
      ...(role ? { role: roles[role] } : {}),
      ...(keyword ? { OR: [{ name: containsText(keyword) }, { email: containsText(keyword) }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.account.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.account.count({ where }),
    ]);
    return { data: rows.map(toDto), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
  async findById(id: string, companyCode?: string): Promise<Account> {
    const row = await prisma.account.findFirst({ where: { id, companyCode: this.scope(companyCode), deletedAt: null } });
    if (!row) throw new ApiError(404, 'Account not found');
    return toDto(row);
  }
  async findByEmail(email: string, companyCode?: string): Promise<Account | undefined> {
    const row = await prisma.account.findFirst({ where: { email, companyCode: this.scope(companyCode), deletedAt: null } });
    return row ? toDto(row) : undefined;
  }
  async create(input: AccountCreateInput, companyCode?: string, createdBy?: string): Promise<Account> {
    try {
      return toDto(await prisma.account.create({ data: {
        name: input.name, email: input.email, phone: input.phone, role: roles[input.role], companyCode: this.scope(companyCode), createdBy,
      } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'Email already exists in this company');
      throw error;
    }
  }
  async update(id: string, input: AccountUpdateInput, companyCode?: string): Promise<Account> {
    await this.findById(id, companyCode);
    try {
      return toDto(await prisma.account.update({ where: { id }, data: {
        name: input.name, email: input.email, phone: input.phone,
        ...(input.role ? { role: roles[input.role] } : {}),
        ...(input.status ? { status: statuses[input.status], deletedAt: input.status === 'deleted' ? new Date() : null } : {}),
      } }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'Email already exists in this company');
      throw error;
    }
  }
  async delete(id: string, companyCode?: string): Promise<void> {
    await this.findById(id, companyCode);
    await prisma.account.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
  }
  async getAll(companyCode?: string): Promise<Account[]> {
    return (await prisma.account.findMany({ where: { companyCode: this.scope(companyCode) } })).map(toDto);
  }
  async clearAll(companyCode?: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') throw new ApiError(403, 'Test helper is disabled');
    await prisma.account.deleteMany({ where: { companyCode: this.scope(companyCode) } });
  }
}
export const accountsService = new AccountsService();
