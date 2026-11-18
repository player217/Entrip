import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AccountsPageContent from '@/components/pages/AccountsPageContent';
import ApprovalPageContent from '@/components/pages/ApprovalPageContent';
import { financeRequest, allFinanceRows } from '@/components/finance/api';

const mockUser = { id: 'reviewer', companyCode: 'entrip', role: 'ADMIN' };
let mockSavedState: Record<string, unknown> = {};
jest.mock('@/lib/auth-store', () => ({
  useAuthStore: Object.assign((selector: (state: unknown) => unknown) => selector({ user: mockUser }), {
    getState: () => ({ user: mockUser }),
  }),
}));
jest.mock('@/hooks/useTabState', () => ({
  useTabState: (initial: unknown, key: string) =>
    React.useState(mockSavedState[key] === undefined ? initial : mockSavedState[key]),
}));
jest.mock('@/components/workspace/WorkspaceTabContext', () => ({ useWorkspaceTabKey: () => undefined }));
jest.mock('@entrip/shared/client', () => ({ useWorkspaceStore: { getState: jest.fn() } }));
jest.mock('@/components/finance/api', () => ({
  ...jest.requireActual('@/components/finance/api'),
  financeRequest: jest.fn(),
  allFinanceRows: jest.fn(),
}));

const account = {
  id: 'bank-1', accountName: '운영 계좌', bankName: '검증 은행', accountNumber: '123',
  holderName: '여행사', currency: 'KRW', openingBalance: '100', balance: '100',
  hasTransactions: true,
};

function mockAccounts(hasTransactions = true) {
  (financeRequest as jest.Mock).mockImplementation(async (path: string) => {
    if (path === 'bank-accounts') return { data: [{ ...account, hasTransactions }] };
    if (path.startsWith('finance?')) return { data: [], pagination: { pages: 1 } };
    return { data: {} };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSavedState = {};
  (allFinanceRows as jest.Mock).mockResolvedValue([]);
});

test('locks currency and opening balance from server history even when the ledger page is empty', async () => {
  mockAccounts();
  render(<AccountsPageContent />);
  fireEvent.click(await screen.findByRole('button', { name: '수정', exact: true }));
  expect(screen.getByLabelText('통화')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('기초잔액')).toHaveAttribute('readonly');
  expect(screen.getByText(/거래 이력이 있어 통화와 기초잔액은 읽기 전용/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('계좌 이름'), { target: { value: '수정된 운영 계좌' } });
  fireEvent.click(screen.getByRole('button', { name: '계좌 저장' }));
  await waitFor(() => expect(financeRequest).toHaveBeenCalledWith('bank-accounts/bank-1', {
    method: 'PUT',
    body: JSON.stringify({
      accountName: '수정된 운영 계좌', bankName: '검증 은행', accountNumber: '123',
      holderName: '여행사', currency: 'KRW', openingBalance: 100,
    }),
  }));
  expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
});

test('restored drafts cannot overwrite locked values after account history loads', async () => {
  mockAccounts();
  mockSavedState = {
    showBankAccount: true,
    bankAccountDraft: {
      editingId: account.id, accountName: '복원된 이름', bankName: account.bankName,
      accountNumber: account.accountNumber, holderName: account.holderName,
      currency: 'USD', openingBalance: '999',
    },
  };
  render(<AccountsPageContent />);
  expect(screen.getByRole('button', { name: '계좌 저장' })).toBeDisabled();
  await waitFor(() => expect(screen.getByRole('button', { name: '계좌 저장' })).toBeEnabled());
  expect(screen.getByLabelText('통화')).toHaveValue('KRW');
  expect(screen.getByLabelText('기초잔액')).toHaveValue(100);
  fireEvent.click(screen.getByRole('button', { name: '계좌 저장' }));
  await waitFor(() => expect(financeRequest).toHaveBeenCalledWith('bank-accounts/bank-1', expect.objectContaining({
    method: 'PUT',
    body: expect.stringContaining('"openingBalance":100'),
  })));
  const [, request] = (financeRequest as jest.Mock).mock.calls.find(([path]) => path === 'bank-accounts/bank-1');
  expect(JSON.parse(request.body)).toMatchObject({ currency: 'KRW', openingBalance: 100 });
});

test('accounts with no transaction history still allow currency and opening balance edits', async () => {
  mockAccounts(false);
  render(<AccountsPageContent />);
  fireEvent.click(await screen.findByRole('button', { name: '수정', exact: true }));
  expect(screen.getByLabelText('통화')).not.toHaveAttribute('readonly');
  expect(screen.getByLabelText('기초잔액')).not.toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('통화'), { target: { value: 'usd' } });
  fireEvent.change(screen.getByLabelText('기초잔액'), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: '계좌 저장' }));
  await waitFor(() => expect(financeRequest).toHaveBeenCalledWith('bank-accounts/bank-1', expect.objectContaining({ method: 'PUT' })));
  const [, request] = (financeRequest as jest.Mock).mock.calls.find(([path]) => path === 'bank-accounts/bank-1');
  expect(JSON.parse(request.body)).toMatchObject({ currency: 'USD', openingBalance: 25 });
});

test('ended approvals distinguish unperformed steps while preserving past actions and pending review controls', async () => {
  const base = {
    content: '검토 내용', requesterId: 'requester', requester: { name: '요청자' },
    currency: 'KRW', currentStep: 0, createdAt: '2026-11-17T00:00:00.000Z',
  };
  (financeRequest as jest.Mock).mockResolvedValue({
    data: [
      { ...base, id: 'rejected', title: '반려 요청', status: 'rejected', steps: [
        { approverId: 'first', approver: { name: '1차 검토자' }, action: 'reject', comment: '금액 확인 필요' },
        { approverId: 'reviewer', approver: { name: '2차 검토자' } },
      ] },
      { ...base, id: 'cancelled', title: '취소 요청', status: 'cancelled', steps: [
        { approverId: 'reviewer', approver: { name: '검토자' } },
      ] },
      { ...base, id: 'pending', title: '대기 요청', status: 'pending', steps: [
        { approverId: 'reviewer', approver: { name: '검토자' } },
      ] },
    ], pagination: { pages: 1, total: 3 },
  });
  render(<ApprovalPageContent />);
  await screen.findByRole('heading', { name: '반려 요청' });
  const rejected = screen.getByRole('heading', { name: '반려 요청' }).closest('article')!;
  const cancelled = screen.getByRole('heading', { name: '취소 요청' }).closest('article')!;
  const pending = screen.getByRole('heading', { name: '대기 요청' }).closest('article')!;
  expect(within(rejected).getByText(/미진행 · 반려 종료/)).toBeVisible();
  expect(within(rejected).getByText('금액 확인 필요')).toBeVisible();
  expect(within(cancelled).getByText(/미진행 · 요청 취소/)).toBeVisible();
  for (const ended of [rejected, cancelled]) {
    expect(within(ended).queryByText(/· 대기/)).not.toBeInTheDocument();
    expect(within(ended).queryByRole('button', { name: '승인', exact: true })).not.toBeInTheDocument();
    expect(within(ended).queryByRole('button', { name: '요청 취소' })).not.toBeInTheDocument();
  }
  expect(within(pending).getByText(/· 대기/)).toBeVisible();
  expect(within(pending).getByRole('button', { name: '승인', exact: true })).toBeEnabled();
});
