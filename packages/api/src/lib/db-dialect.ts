import { Prisma } from '@prisma/client';

export const databaseUrl = process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

export const usingSQLite = databaseUrl?.startsWith('file:') ?? false;

export function containsText(value: string) {
  // SQLite's LIKE already folds ASCII case. Prisma only accepts mode on PostgreSQL.
  return usingSQLite ? { contains: value } : { contains: value, mode: 'insensitive' as const };
}

type LockedTable = 'BankAccount' | 'FinanceRecord' | 'Approval';

function reserveSQLiteWriter(tx: Prisma.TransactionClient) {
  // Obtain the SQLite write reservation before reading mutable state. This
  // empty update does not change a business row or fire any change triggers.
  return tx.$executeRaw`UPDATE "User" SET id = id WHERE 0`;
}

export async function lockRow(tx: Prisma.TransactionClient, table: LockedTable, id: string) {
  if (usingSQLite) {
    await reserveSQLiteWriter(tx);
  } else {
    const identifier = Prisma.raw('"' + table + '"');
    await tx.$queryRaw`SELECT id FROM ${identifier} WHERE id = ${id} FOR UPDATE`;
  }
}

export async function lockConversationPair(tx: Prisma.TransactionClient, key: string) {
  if (usingSQLite) {
    await reserveSQLiteWriter(tx);
  } else {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  }
}
