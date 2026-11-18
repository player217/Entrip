'use client';
import { useCallback, useEffect, useId, useState } from 'react';
import { FinanceDraftPrint } from '@/components/finance/FinanceDraftPrint';
import { useAuthStore } from '@/lib/auth-store';
import { useCompanyRefresh } from '@/hooks/useCompanyRefresh';
import { useTabState } from '@/hooks/useTabState';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';
import { useWorkspaceStore } from '@entrip/shared/client';
import {
  BankAccount,
  FinanceRecord,
  financeRequest,
  financeInputClass as inputClass,
  financeButtonClass as buttonClass,
  financePaginationClass as paginationClass,
  money,
  errorMessage,
  localFinanceDate,
} from '@/components/finance/api';

const initialAccount = {
  editingId: '',
  expectedUpdatedAt: '',
  accountName: '',
  bankName: '',
  accountNumber: '',
  holderName: '',
  currency: 'KRW',
  openingBalance: '0',
};
const initialEntry = {
  editingId: '',
  expectedUpdatedAt: '',
  accountId: '',
  type: 'expense',
  category: '',
  amount: '',
  occurredAt: '',
  description: '',
};
export default function AccountsPageContent() {
  const accountValueHelpId = useId();
  const ledgerScrollHelpId = useId();
  const user = useAuthStore((state) => state.user);
  const role = user?.role?.toUpperCase();
  const canEdit = role === 'ADMIN' || role === 'MANAGER';
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [accountDraft, setAccountDraft] = useTabState(initialAccount, 'bankAccountDraft');
  const [entryDraft, setEntryDraft] = useTabState(initialEntry, 'financeEntryDraft');
  const [showAccount, setShowAccount] = useTabState(false, 'showBankAccount');
  const [showEntry, setShowEntry] = useTabState(false, 'showFinanceEntry');
  const [accountDirty, setAccountDirty] = useTabState(false, 'bankAccountDirty');
  const [entryDirty, setEntryDirty] = useTabState(false, 'financeEntryDirty');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [loadedQuery, setLoadedQuery] = useState('');
  const queryKey = JSON.stringify([user?.companyCode, user?.id, page, filter]);
  const queryReady = queryKey === loadedQuery;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const editingAccount = accounts.find((account) => account.id === accountDraft.editingId);
  const accountDetailsPending = Boolean(accountDraft.editingId) &&
    typeof editingAccount?.hasTransactions !== 'boolean';
  const accountValuesLocked = Boolean(accountDraft.editingId) &&
    editingAccount?.hasTransactions !== false;
  const key = useWorkspaceTabKey();
  useEffect(() => {
    if (key)
      useWorkspaceStore.getState().updateTabState(key, {
        isDirty: (showAccount && accountDirty) || (showEntry && entryDirty),
      });
  }, [key, showAccount, accountDirty, showEntry, entryDirty]);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const [bankData, financeData] = await Promise.all([
        financeRequest<{ data: BankAccount[] }>('bank-accounts', { signal }),
        financeRequest<{ data: FinanceRecord[]; pagination: { pages: number } }>(
          `finance?page=${page}&limit=20${filter ? `&accountId=${encodeURIComponent(filter)}` : ''}`,
          { signal }
        ),
      ]);
      if (
        signal?.aborted ||
        useAuthStore.getState().user?.id !== user?.id ||
        useAuthStore.getState().user?.companyCode !== user?.companyCode
      )
        return;
      setLoadedQuery(queryKey);
      setAccounts(bankData.data);
      setRecords(financeData.data);
      setPages(Math.max(1, financeData.pagination.pages));
    },
    [page, filter, queryKey, user?.id, user?.companyCode]
  );
  useCompanyRefresh(['finance'], refresh);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    refresh(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(errorMessage(e));
    });
    return () => controller.abort();
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const draftCurrency = accountValuesLocked && editingAccount ? editingAccount.currency : accountDraft.currency;
  const draftBalance = accountValuesLocked && editingAccount ? String(editingAccount.openingBalance) : accountDraft.openingBalance;
  const entryAccount = accounts.find((account) => account.id === entryDraft.accountId);
  return (
    <section className="operations-report accounts-report space-y-5 min-w-0 p-2 sm:p-4" data-print-draft={showAccount || showEntry}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">계좌 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            통화별 계좌 잔액 · 승인된 거래만 잔액에 반영됩니다.
          </p>
        </div>
        <div className="entrip-no-print flex gap-2">
          <button
            className="border rounded px-3 py-2 text-sm"
            disabled={busy}
            onClick={() => void run(async () => {})}
          >
            새로고침
          </button>
          {canEdit && (
            <>
              <button
                className={buttonClass}
                disabled={showAccount || showEntry}
                onClick={() => {
                  setAccountDraft(initialAccount);
                  setShowAccount(true);
                }}
              >
                계좌 추가
              </button>
              <button
                className={buttonClass}
                disabled={!accounts.length || showAccount || showEntry}
                onClick={() => {
                  setEntryDraft({
                    ...initialEntry,
                    accountId: accounts[0]?.id || '',
                    occurredAt: localFinanceDate(),
                  });
                  setShowEntry(true);
                }}
              >
                거래 등록
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="entrip-no-print text-sm text-green-700">
          {notice}
        </p>
      )}
      {showAccount && (
        <FinanceDraftPrint title={accountDraft.editingId ? '계좌 수정' : '새 계좌'} fields={[
          ['계좌 이름', accountDraft.accountName], ['은행', accountDraft.bankName],
          ['계좌 번호', accountDraft.accountNumber], ['예금주', accountDraft.holderName],
          ['통화', draftCurrency], ['기초잔액', draftBalance ? money(draftBalance, draftCurrency) : undefined],
        ]} />
      )}
      {showEntry && (
        <FinanceDraftPrint title={entryDraft.editingId ? '대기 거래 수정' : '새 거래'} fields={[
          ['계좌', entryAccount?.accountName], ['입출금 구분', entryDraft.type === 'income' ? '입금' : '출금'],
          ['항목', entryDraft.category], ['금액', entryDraft.amount && entryAccount ? money(entryDraft.amount, entryAccount.currency) : entryDraft.amount],
          ['거래일', entryDraft.occurredAt], ['적요', entryDraft.description],
        ]} />
      )}
      {accounts.length > 0 && (
        <div className="entrip-print-only">
          <h2 className="account-balance-heading">전체 계좌 잔액</h2>
          <table className="operations-data-table account-balance-table" aria-label="전체 계좌 잔액">
            <thead><tr>
              <th scope="col">계좌 이름</th><th scope="col">은행 · 계좌 번호</th>
              <th scope="col">예금주</th><th scope="col">현재 잔액</th>
            </tr></thead>
            <tbody>{accounts.map(account => (
              <tr key={account.id}>
                <td>{account.accountName}</td><td>{account.bankName} · {account.accountNumber}</td>
                <td>{account.holderName}</td><td>{money(account.balance, account.currency)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="entrip-no-print account-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <article key={account.id} className="min-w-0 rounded-lg border bg-white p-4">
            <div className="flex justify-between gap-2">
              <h2 className="font-semibold break-words">{account.accountName}</h2>
              {canEdit && (
                <button
                  disabled={showAccount || showEntry}
                  className="text-sm text-blue-700 shrink-0 disabled:opacity-40"
                  onClick={() => {
                    setAccountDraft({
                      accountName: account.accountName,
                      bankName: account.bankName,
                      accountNumber: account.accountNumber,
                      holderName: account.holderName,
                      currency: account.currency,
                      openingBalance: String(account.openingBalance),
                      editingId: account.id,
                      expectedUpdatedAt: account.updatedAt,
                    });
                    setShowAccount(true);
                  }}
                >
                  수정
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 break-all">
              {account.bankName} · {account.accountNumber}
            </p>
            <p className="text-xs text-gray-500">{account.holderName}</p>
            <p className="mt-3 text-xl font-semibold">{money(account.balance, account.currency)}</p>
          </article>
        ))}
      </div>
      {queryReady && !accounts.length && !error && (
        <p className="rounded-lg border bg-white p-6 text-gray-500">등록된 계좌가 없습니다.</p>
      )}
      {showAccount && (
        <form
          className="rounded-lg border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (accountDetailsPending) return;
            void run(async () => {
              const { editingId, expectedUpdatedAt, ...fields } = accountDraft;
              if (editingId && !expectedUpdatedAt)
                throw new Error('계좌 수정 시점을 확인할 수 없습니다. 입력 내용을 확인한 후 취소하고 다시 수정해 주세요.');
              await financeRequest(`bank-accounts${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify({
                  ...fields,
                  ...(editingId && { expectedUpdatedAt }),
                  currency: accountValuesLocked && editingAccount
                    ? editingAccount.currency : fields.currency,
                  openingBalance: Number(accountValuesLocked && editingAccount
                    ? editingAccount.openingBalance : fields.openingBalance),
                }),
              });
              setShowAccount(false);
              setAccountDraft(initialAccount);
              setAccountDirty(false);
              setNotice('계좌를 저장했습니다.');
            });
          }}
        >
          <h2 className="font-semibold mb-3">{accountDraft.editingId ? '계좌 수정' : '새 계좌'}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['accountName', '계좌 이름'],
                ['bankName', '은행'],
                ['accountNumber', '계좌 번호'],
                ['holderName', '예금주'],
                ['currency', '통화'],
                ['openingBalance', '기초잔액'],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="text-sm">
                {label}
                <input
                  className={`${inputClass} read-only:cursor-default read-only:bg-gray-100 read-only:text-gray-600`}
                  required
                  readOnly={accountValuesLocked && (field === 'currency' || field === 'openingBalance')}
                  aria-describedby={field === 'currency' || field === 'openingBalance' ? accountValueHelpId : undefined}
                  value={accountValuesLocked && editingAccount && (field === 'currency' || field === 'openingBalance')
                    ? String(editingAccount[field]) : accountDraft[field]}
                  type={field === 'openingBalance' ? 'number' : 'text'}
                  step="0.01"
                  maxLength={field === 'currency' ? 3 : 100}
                  onChange={(e) => {
                    setAccountDraft((previous) => ({
                      ...previous,
                      [field]: field === 'currency' ? e.target.value.toUpperCase() : e.target.value,
                    }));
                    setAccountDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
          <p id={accountValueHelpId} className="my-3 text-xs text-gray-500">
            {accountDetailsPending
              ? '계좌 정보를 확인하고 있습니다. 통화와 기초잔액은 확인 후 편집할 수 있습니다.'
              : accountValuesLocked
                ? '거래 이력이 있어 통화와 기초잔액은 읽기 전용입니다. 계좌 이름과 은행 정보는 수정할 수 있습니다.'
                : '거래가 등록되면 기초잔액과 통화는 변경할 수 없습니다.'}
          </p>
          <div className="flex gap-2">
            <button className={buttonClass} disabled={busy || accountDetailsPending}>
              계좌 저장
            </button>
            <button
              type="button"
              className="px-3 text-sm"
              onClick={() => {
                setShowAccount(false);
                setAccountDraft(initialAccount);
                setAccountDirty(false);
              }}
            >
              취소
            </button>
            {accountDraft.editingId && role === 'ADMIN' && (
              <button
                type="button"
                className="text-red-700 text-sm"
                disabled={busy}
                onClick={() => {
                  if (confirm('이 계좌를 삭제할까요? 거래 이력이 있으면 삭제되지 않습니다.'))
                    void run(async () => {
                      await financeRequest(`bank-accounts/${accountDraft.editingId}`, {
                        method: 'DELETE',
                      });
                      setShowAccount(false);
                      setAccountDraft(initialAccount);
                      setAccountDirty(false);
                    });
                }}
              >
                계좌 삭제
              </button>
            )}
          </div>
        </form>
      )}
      {showEntry && (
        <form
          className="rounded-lg border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const account = accounts.find((item) => item.id === entryDraft.accountId);
              if (!account) throw new Error('계좌를 선택해 주세요.');
              const { editingId, expectedUpdatedAt, ...fields } = entryDraft;
              if (editingId && !expectedUpdatedAt)
                throw new Error('거래 수정 시점을 확인할 수 없습니다. 입력 내용을 확인한 후 취소하고 다시 수정해 주세요.');
              await financeRequest(`finance${editingId ? `/${editingId}` : ''}`, {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify({
                  ...fields,
                  ...(editingId && { expectedUpdatedAt }),
                  amount: Number(fields.amount),
                  occurredAt: `${fields.occurredAt}T00:00:00.000Z`,
                  currency: account.currency,
                  exchangeRate: 1,
                }),
              });
              setEntryDraft(initialEntry);
              setShowEntry(false);
              setEntryDirty(false);
              setNotice('거래를 저장했습니다. 다른 관리자의 승인 후 잔액에 반영됩니다.');
            });
          }}
        >
          <h2 className="font-semibold mb-3">
            {entryDraft.editingId ? '대기 거래 수정' : '새 거래'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              계좌
              <select
                aria-label="계좌"
                className={inputClass}
                required
                value={entryDraft.accountId}
                onChange={(e) => {
                  setEntryDraft((p) => ({ ...p, accountId: e.target.value }));
                  setEntryDirty(true);
                }}
              >
                <option value="">선택</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName} ({a.currency})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              입출금 구분
              <select
                aria-label="입출금 구분"
                className={inputClass}
                value={entryDraft.type}
                onChange={(e) => {
                  setEntryDraft((p) => ({ ...p, type: e.target.value }));
                  setEntryDirty(true);
                }}
              >
                <option value="income">입금</option>
                <option value="expense">출금</option>
              </select>
            </label>
            {(
              [
                ['category', '항목', 'text'],
                ['amount', '금액', 'number'],
                ['occurredAt', '거래일', 'date'],
                ['description', '적요', 'text'],
              ] as const
            ).map(([field, label, type]) => (
              <label key={field} className="text-sm">
                {label}
                <input
                  className={inputClass}
                  type={type}
                  min={type === 'number' ? '0.01' : undefined}
                  step="0.01"
                  required={field !== 'description'}
                  value={entryDraft[field]}
                  onChange={(e) => {
                    setEntryDraft((p) => ({ ...p, [field]: e.target.value }));
                    setEntryDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button className={buttonClass} disabled={busy}>
              거래 저장
            </button>
            <button
              type="button"
              className="px-3 text-sm"
              onClick={() => {
                setShowEntry(false);
                setEntryDraft(initialEntry);
                setEntryDirty(false);
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
      <div className="account-ledger rounded-lg border bg-white overflow-hidden">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">입출금 내역</h2>
          <label className="entrip-no-print text-sm">
            계좌 필터
            <select
              aria-label="계좌 필터"
              className="ml-2 border rounded px-2 py-1 max-w-full"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">전체 계좌</option>
              {accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.accountName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="entrip-print-only operations-print-scope">
          입출금 조회 계좌 · {filter ? accounts.find((account) => account.id === filter)?.accountName || '선택한 계좌' : '전체 계좌'}
          {queryReady && ` · 조회 페이지 ${page} / ${pages} · 이 페이지 ${records.length}건`}
        </p>
        <p id={ledgerScrollHelpId} className="entrip-no-print px-3 pb-2 text-xs text-gray-500">
          표를 좌우로 스크롤해 거래 정보를 확인하세요. 항목 열은 고정됩니다.
        </p>
        <div className="overflow-auto" role="region" aria-label="입출금 내역 표" aria-describedby={ledgerScrollHelpId} tabIndex={0}>
          <table className="operations-data-table w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['항목', '계좌', '거래일', '입출금', '금액', '상태', '작업'].map((text, index) => (
                  <th key={text} scope="col" className={`p-3 text-left font-medium ${text === '작업' ? 'entrip-no-print' : ''} ${index === 0 ? 'sticky left-0 z-10 bg-gray-50 border-r' : ''}`}>
                    {text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryReady && records.map((record) => (
                <tr key={record.id} className="border-t">
                  <th scope="row" className="sticky left-0 z-10 min-w-[9rem] max-w-[11rem] whitespace-normal break-words border-r bg-white p-3 text-left font-normal [overflow-wrap:anywhere]">
                    {record.category}
                    <p className="text-xs text-gray-400">{record.description}</p>
                  </th>
                  <td className="p-3">{record.account?.accountName || '미지정'}</td>
                  <td className="p-3">{record.occurredAt.slice(0, 10)}</td>
                  <td className="p-3">{record.type === 'INCOME' ? '입금' : '출금'}</td>
                  <td className="p-3">{money(record.amount, record.currency)}</td>
                  <td className="p-3">
                    {{ PENDING: '대기', APPROVED: '승인', REJECTED: '반려' }[record.status]}
                  </td>
                  <td className="entrip-no-print p-3">
                    <div className="flex gap-3">
                      {record.status === 'PENDING' && canEdit && (
                        <button
                          disabled={showAccount || showEntry}
                          className="text-blue-700 disabled:opacity-40"
                          onClick={() => {
                            setEntryDraft({
                              editingId: record.id,
                              expectedUpdatedAt: record.updatedAt,
                              accountId: record.accountId || '',
                              type: record.type.toLowerCase(),
                              category: record.category,
                              amount: String(record.amount),
                              occurredAt: record.occurredAt.slice(0, 10),
                              description: record.description || '',
                            });
                            setShowEntry(true);
                          }}
                        >
                          수정
                        </button>
                      )}
                      {record.status === 'PENDING' &&
                        role === 'ADMIN' &&
                        record.createdBy !== user?.id && (
                          <>
                            {(['approved', 'rejected'] as const).map((status) => (
                              <button
                                className={
                                  status === 'approved' ? 'text-green-700' : 'text-red-700'
                                }
                                disabled={busy}
                                key={status}
                                onClick={() =>
                                  void run(async () => {
                                    await financeRequest(`finance/${record.id}/approve`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ status }),
                                    });
                                    setNotice(
                                      status === 'approved'
                                        ? '거래를 승인했습니다.'
                                        : '거래를 반려했습니다.'
                                    );
                                  })
                                }
                              >
                                {status === 'approved' ? '승인' : '반려'}
                              </button>
                            ))}
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!queryReady && !error && <p role="status" className="p-6 text-sm text-gray-500">거래를 조회하는 중…</p>}
        {queryReady && !records.length && <p className="p-6 text-sm text-gray-500">조회된 거래가 없습니다.</p>}
        <div className="entrip-no-print flex justify-end items-center gap-3 p-3 text-sm">
          <button className={paginationClass} disabled={page <= 1 || busy} onClick={() => setPage((p) => p - 1)}>
            이전
          </button>
          <span>
            {page} / {pages}
          </span>
          <button className={paginationClass} disabled={page >= pages || busy} onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
      </div>
    </section>
  );
}
