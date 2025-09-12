import { PrismaClient, Account, AccountRole, AccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface AccountCreateDto {
  name: string;
  email: string;
  phone?: string;
  role?: AccountRole;
  status?: AccountStatus;
  passwordHash?: string;
}

export interface AccountUpdateDto {
  name?: string;
  email?: string;
  phone?: string;
  role?: AccountRole;
  status?: AccountStatus;
  passwordHash?: string;
  lastLoginAt?: Date;
}

export interface AccountQueryDto {
  page?: number;
  limit?: number;
  role?: AccountRole;
  status?: AccountStatus;
  keyword?: string; // Search in name or email
}

export interface AccountStats {
  total: number;
  byRole: Record<AccountRole, number>;
  byStatus: Record<AccountStatus, number>;
  recentlyCreated: number; // Created in last 30 days
  recentlyActive: number; // Logged in within last 7 days
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * List accounts with pagination and filters
 */
export const listAccounts = async (query: AccountQueryDto): Promise<{
  data: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const { page = 1, limit = 20, role, status, keyword } = query;

  const where = {
    deletedAt: null, // Only non-deleted accounts
    ...(role && { role }),
    ...(status && { status }),
    ...(keyword && {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' as const } },
        { email: { contains: keyword, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [total, accounts] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash from list results
      },
    }),
  ]);

  return {
    data: accounts.map(a => ({ ...a, deletedAt: null, passwordHash: '' })) as Account[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single account by ID
 */
export const getAccountById = async (id: string): Promise<Account | null> => {
  return prisma.account.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash from get results
    },
  }).then(a => a ? { ...a, deletedAt: null, passwordHash: '' } as Account : null);
};

/**
 * Get account by email (for authentication)
 */
export const getAccountByEmail = async (email: string, includePassword: boolean = false): Promise<Account | null> => {
  return prisma.account.findFirst({
    where: {
      email,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      passwordHash: includePassword, // Include password hash only when needed
    },
  }).then(a => a ? { ...a, deletedAt: null, passwordHash: '' } as Account : null);
};

/**
 * Create a new account
 */
export const createAccount = async (dto: AccountCreateDto): Promise<Account> => {
  // Check if email already exists
  const existingAccount = await getAccountByEmail(dto.email);
  if (existingAccount) {
    throw new Error('Email already exists');
  }

  const account = await prisma.account.create({
    data: {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      role: dto.role || 'staff',
      status: dto.status || 'active',
      passwordHash: dto.passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash from create result
    },
  });

  return { ...account, deletedAt: null, passwordHash: '' } as Account;
};

/**
 * Update an existing account
 */
export const updateAccount = async (id: string, dto: AccountUpdateDto): Promise<Account> => {
  // Check if email is being changed and already exists
  if (dto.email) {
    const existingAccount = await getAccountByEmail(dto.email);
    if (existingAccount && existingAccount.id !== id) {
      throw new Error('Email already exists');
    }
  }

  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.passwordHash !== undefined && { passwordHash: dto.passwordHash }),
      ...(dto.lastLoginAt !== undefined && { lastLoginAt: dto.lastLoginAt }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash from update result
    },
  });

  return { ...account, deletedAt: null, passwordHash: '' } as Account;
};

/**
 * Update account status only
 */
export const updateAccountStatus = async (id: string, status: AccountStatus): Promise<Account> => {
  return updateAccount(id, { status });
};

/**
 * Record login activity
 */
export const recordLogin = async (id: string): Promise<Account> => {
  return updateAccount(id, { lastLoginAt: new Date() });
};

/**
 * Soft delete an account
 */
export const deleteAccount = async (id: string): Promise<Account> => {
  return prisma.account.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      status: 'deleted',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash
    },
  }).then(a => ({ ...a, deletedAt: null })) as Promise<Account>;
};

/**
 * Get account statistics
 */
export const getAccountStats = async (): Promise<AccountStats> => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, byRole, byStatus, recentlyCreated, recentlyActive] = await Promise.all([
    prisma.account.count({ where: { deletedAt: null } }),
    prisma.account.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.account.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.account.count({
      where: {
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.account.count({
      where: {
        deletedAt: null,
        lastLoginAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  return {
    total,
    byRole: byRole.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<AccountRole, number>),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<AccountStatus, number>),
    recentlyCreated,
    recentlyActive,
  };
};

/**
 * Search accounts by role and/or email domain
 */
export const searchAccounts = async (searchTerm: string, role?: AccountRole): Promise<Account[]> => {
  return prisma.account.findMany({
    where: {
      deletedAt: null,
      ...(role && { role }),
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash from search results
    },
    orderBy: { name: 'asc' },
  }).then(accounts => accounts.map(a => ({ ...a, deletedAt: null, passwordHash: '' }))) as Promise<Account[]>;
};

/**
 * Get accounts by role (useful for approval workflows)
 */
export const getAccountsByRole = async (role: AccountRole): Promise<Account[]> => {
  return prisma.account.findMany({
    where: {
      deletedAt: null,
      role,
      status: 'active', // Only active accounts
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      // Exclude passwordHash
    },
    orderBy: { name: 'asc' },
  }).then(accounts => accounts.map(a => ({ ...a, deletedAt: null, passwordHash: '' }))) as Promise<Account[]>;
};

/**
 * Bulk update account statuses
 */
export const bulkUpdateAccountStatus = async (ids: string[], status: AccountStatus): Promise<number> => {
  const result = await prisma.account.updateMany({
    where: {
      id: { in: ids },
      deletedAt: null,
    },
    data: { status },
  });

  return result.count;
};

/**
 * Clean up function to close Prisma connection
 */
export const closePrismaConnection = async () => {
  await prisma.$disconnect();
};