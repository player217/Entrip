export async function financeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || `요청 실패 (${response.status})`);
  return result as T;
}
export const financeInputClass =
  'mt-1 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
export const financeButtonClass =
  'rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50';
export function money(value: string | number, currency: string) {
  return `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} ${currency}`;
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}
export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  currency: string;
  openingBalance: string;
  balance: string;
}
export interface FinanceRecord {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: string;
  currency: string;
  exchangeRate: string;
  occurredAt: string;
  description?: string;
  accountId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdBy: string;
  account?: BankAccount;
}

export async function allFinanceRows<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let more = true;
  while (more) {
    const result = await financeRequest<{
      data: T[];
      totalPages?: number;
      pagination?: { pages: number };
    }>(`${path}${path.includes('?') ? '&' : '?'}limit=100&page=${page}`, { signal });
    items.push(...result.data);
    const pages = result.pagination?.pages ?? result.totalPages;
    more = pages !== undefined ? page < pages : result.data.length === 100;
    page += 1;
  }
  return items;
}

export function localFinanceDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
