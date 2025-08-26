import { ApiError } from '../../middlewares/error.middleware';
import { AccountCreateInput } from './dtos/AccountCreate.dto';
import { AccountUpdateInput } from './dtos/AccountUpdate.dto';
import { AccountQueryInput } from './dtos/AccountQuery.dto';

// Types
export interface Account {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'approver' | 'staff' | 'viewer';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

// In-memory storage
const accounts: Account[] = [];
const accountsById = new Map<string, Account>();
let idCounter = 1;

// Service implementation
export class AccountsService {
  async list(query: AccountQueryInput) {
    const { page = 1, limit = 20, status, role, keyword } = query;
    
    // Filter accounts (exclude soft-deleted unless specifically requested)
    const filtered = accounts.filter(account => {
      if (!status && account.deletedAt) return false;
      if (status && account.status !== status) return false;
      if (role && account.role !== role) return false;
      if (keyword) {
        const searchTerm = keyword.toLowerCase();
        return (
          account.name.toLowerCase().includes(searchTerm) ||
          account.email.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    });

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

  async findById(id: string): Promise<Account> {
    const account = accountsById.get(id);
    if (!account || account.deletedAt) {
      throw new ApiError(404, 'Account not found');
    }
    return account;
  }

  async findByEmail(email: string): Promise<Account | undefined> {
    return accounts.find(
      account => account.email === email && !account.deletedAt
    );
  }

  async create(input: AccountCreateInput): Promise<Account> {
    // Check email uniqueness
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ApiError(409, 'Email already exists');
    }

    const newAccount: Account = {
      id: `acc-${idCounter++}`,
      ...input,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    accountsById.set(newAccount.id, newAccount);

    return newAccount;
  }

  async update(id: string, input: AccountUpdateInput): Promise<Account> {
    const account = await this.findById(id);

    // Check email uniqueness if email is being updated
    if (input.email && input.email !== account.email) {
      const existing = await this.findByEmail(input.email);
      if (existing) {
        throw new ApiError(409, 'Email already exists');
      }
    }

    // Update fields
    Object.assign(account, {
      ...input,
      updatedAt: new Date().toISOString(),
    });

    return account;
  }

  async delete(id: string): Promise<void> {
    const account = await this.findById(id);
    
    // Soft delete
    account.status = 'deleted';
    account.deletedAt = new Date().toISOString();
  }

  // Utility methods for testing
  async clearAll() {
    accounts.length = 0;
    accountsById.clear();
    idCounter = 1;
  }

  async getAll(): Promise<Account[]> {
    return [...accounts];
  }
}

export const accountsService = new AccountsService();