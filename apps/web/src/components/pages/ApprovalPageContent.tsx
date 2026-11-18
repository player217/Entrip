'use client';
import { useCallback, useEffect, useState } from 'react';
import { FinanceDraftPrint } from '@/components/finance/FinanceDraftPrint';
import { useAuthStore } from '@/lib/auth-store';
import { useCompanyRefresh } from '@/hooks/useCompanyRefresh';
import { useTabState } from '@/hooks/useTabState';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';
import { useWorkspaceStore } from '@entrip/shared/client';
import {
  FinanceRecord,
  financeRequest,
  financeInputClass as inputClass,
  financeButtonClass as buttonClass,
  financePaginationClass as paginationClass,
  money,
  errorMessage,
  allFinanceRows,
} from '@/components/finance/api';
interface Person {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}
interface Approval {
  id: string;
  title: string;
  content: string;
  requesterId: string;
  requester: { name: string };
  amount?: string;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  createdAt: string;
  steps: {
    approverId: string;
    approver: { name: string };
    action?: string;
    comment?: string;
    actedAt?: string;
  }[];
}
const initialDraft = {
  title: '',
  content: '',
  targetType: 'custom',
  targetId: '',
  approvers: [''],
};
const statusText = { pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소' };
export default function ApprovalPageContent() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role?.toUpperCase();
  const canRequest = role === 'ADMIN' || role === 'MANAGER';
  const [items, setItems] = useState<Approval[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [finance, setFinance] = useState<FinanceRecord[]>([]);
  const [draft, setDraft] = useTabState(initialDraft, 'approvalDraft');
  const [showForm, setShowForm] = useTabState(false, 'showApprovalForm');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadedQuery, setLoadedQuery] = useState('');
  const queryKey = JSON.stringify([user?.companyCode, user?.id, page, status]);
  const queryReady = queryKey === loadedQuery;
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [comments, setComments] = useState<Record<string, string>>({});
  const key = useWorkspaceTabKey();
  const dirty = (value = true) => {
    if (key) useWorkspaceStore.getState().updateTabState(key, { isDirty: value });
  };
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const [approvals, users, ledger] = await Promise.all([
        financeRequest<{ data: Approval[]; pagination: { pages: number; total: number } }>(
          `approvals?page=${page}&limit=20${status ? `&status=${status}` : ''}`,
          { signal }
        ),
        allFinanceRows<Person>('users?isActive=true', signal),
        allFinanceRows<FinanceRecord>('finance?status=pending', signal),
      ]);
      if (
        signal?.aborted ||
        useAuthStore.getState().user?.id !== user?.id ||
        useAuthStore.getState().user?.companyCode !== user?.companyCode
      )
        return;
      setLoadedQuery(queryKey);
      setItems(approvals.data);
      setPages(Math.max(1, approvals.pagination.pages));
      setTotal(approvals.pagination.total);
      setPeople(
        users.filter(
          (person) =>
            person.isActive !== false && ['ADMIN', 'MANAGER'].includes(person.role.toUpperCase())
        )
      );
      setFinance(ledger);
    },
    [page, status, queryKey, user?.id, user?.companyCode]
  );
  useCompanyRefresh(['finance', 'users'], refresh);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    refresh(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(errorMessage(e));
    });
    return () => controller.abort();
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const selectedFinance = finance.find((record) => record.id === draft.targetId);
  return (
    <section className="operations-report approval-report space-y-5 min-w-0 p-2 sm:p-4" data-print-draft={showForm}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">결재 관리</h1>
          <p className="mt-1 text-sm text-gray-500">지정한 결재자가 순서대로 검토합니다.</p>
        </div>
        <div className="entrip-no-print flex gap-2">
          <button
            className="rounded border px-3 py-2 text-sm"
            disabled={busy}
            onClick={() => void run(async () => {})}
          >
            새로고침
          </button>
          {canRequest && (
            <button className={buttonClass} onClick={() => setShowForm(true)}>
              결재 요청
            </button>
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
      {showForm && (
        <FinanceDraftPrint title="새 결재 요청" fields={[
          ['제목', draft.title], ['결재 유형', draft.targetType === 'finance' ? '입출금 거래 결재' : '일반 결재'],
          ...(draft.targetType === 'finance' ? [['결재할 거래', selectedFinance && `${selectedFinance.category} · ${money(selectedFinance.amount, selectedFinance.currency)} · ${selectedFinance.occurredAt.slice(0, 10)}`] as [string, string | undefined]] : []),
          ['요청 내용', draft.content],
          ...draft.approvers.map((id, index): [string, string | undefined] => [`${index + 1}단계 결재자`, people.find(person => person.id === id)?.name]),
        ]} />
      )}
      {showForm && (
        <form
          className="rounded-lg border bg-white p-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              if (draft.approvers.some((id) => !id))
                throw new Error('모든 결재자를 선택해 주세요.');
              await financeRequest('approvals', {
                method: 'POST',
                body: JSON.stringify({
                  title: draft.title,
                  content: draft.content,
                  targetType: draft.targetType,
                  ...(draft.targetType === 'finance' && { targetId: draft.targetId }),
                  currency: selectedFinance?.currency || 'KRW',
                  steps: draft.approvers.map((approverId, order) => ({ approverId, order })),
                }),
              });
              setShowForm(false);
              setDraft(initialDraft);
              dirty(false);
              setNotice('결재를 요청했습니다.');
            });
          }}
        >
          <h2 className="font-semibold">새 결재 요청</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              제목
              <input
                className={inputClass}
                value={draft.title}
                maxLength={200}
                required
                onChange={(e) => {
                  setDraft((p) => ({ ...p, title: e.target.value }));
                  dirty();
                }}
              />
            </label>
            <label className="text-sm">
              결재 유형
              <select
                aria-label="결재 유형"
                className={inputClass}
                value={draft.targetType}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, targetType: e.target.value, targetId: '' }));
                  dirty();
                }}
              >
                <option value="custom">일반 결재</option>
                <option value="finance">입출금 거래 결재</option>
              </select>
            </label>
          </div>
          {draft.targetType === 'finance' && (
            <label className="block text-sm">
              결재할 거래
              <select
                aria-label="결재할 거래"
                className={inputClass}
                required
                value={draft.targetId}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, targetId: e.target.value }));
                  dirty();
                }}
              >
                <option value="">대기 중인 거래 선택</option>
                {finance.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.category} · {money(record.amount, record.currency)} ·{' '}
                    {record.occurredAt.slice(0, 10)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            요청 내용
            <textarea
              className={inputClass}
              rows={3}
              required
              maxLength={2000}
              value={draft.content}
              onChange={(e) => {
                setDraft((p) => ({ ...p, content: e.target.value }));
                dirty();
              }}
            />
          </label>
          <div>
            <h3 className="text-sm font-medium">결재선</h3>
            <div className="mt-2 space-y-2">
              {draft.approvers.map((id, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <label className="flex-1 min-w-0 text-sm">
                    {index + 1}차 결재자
                    <select
                      aria-label={`${index + 1}차 결재자`}
                      className={inputClass}
                      required
                      value={id}
                      onChange={(e) => {
                        setDraft((p) => ({
                          ...p,
                          approvers: p.approvers.map((value, i) =>
                            i === index ? e.target.value : value
                          ),
                        }));
                        dirty();
                      }}
                    >
                      <option value="">선택</option>
                      {people
                        .filter(
                          (person) =>
                            person.id !== user?.id &&
                            person.id !== selectedFinance?.createdBy &&
                            (person.id === id || !draft.approvers.includes(person.id))
                        )
                        .map((person) => (
                          <option value={person.id} key={person.id}>
                            {person.name} ({person.role})
                          </option>
                        ))}
                    </select>
                  </label>
                  {draft.approvers.length > 1 && (
                    <button
                      type="button"
                      className="mt-5 text-sm text-red-700"
                      onClick={() => {
                        setDraft((p) => ({
                          ...p,
                          approvers: p.approvers.filter((_, i) => i !== index),
                        }));
                        dirty();
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 text-sm text-blue-700"
              onClick={() => {
                setDraft((p) => ({ ...p, approvers: [...p.approvers, ''] }));
                dirty();
              }}
            >
              + 결재자 추가
            </button>
          </div>
          <div className="flex gap-3">
            <button className={buttonClass} disabled={busy}>
              요청 제출
            </button>
            <button
              type="button"
              className="text-sm"
              onClick={() => {
                setShowForm(false);
                setDraft(initialDraft);
                dirty(false);
              }}
            >
              취소
            </button>
          </div>
        </form>
      )}
      <p className="entrip-print-only operations-print-scope">조회 상태 · {statusText[status as keyof typeof statusText] || '전체'}
        {queryReady && ` · 전체 ${total}건 · 조회 페이지 ${page} / ${pages} · 이 페이지 ${items.length}건`}
      </p>
      <div className="entrip-no-print flex flex-wrap gap-2">
        {([['', '전체'], ...Object.entries(statusText)] as [string, string][]).map(
          ([value, text]) => (
            <button
              key={value}
              className={`rounded-full border px-4 py-2 text-sm ${status === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {text}
            </button>
          )
        )}
        <span className="p-2 text-sm text-gray-500">{total}건</span>
      </div>
      <div className="space-y-3">
        {queryReady && items.map((item) => {
          const current = item.steps[item.currentStep];
          const canAct =
            item.status === 'pending' &&
            item.requesterId !== user?.id &&
            current?.approverId === user?.id;
          const canCancel =
            item.status === 'pending' &&
            !item.steps.some((step) => step.action) &&
            (item.requesterId === user?.id || role === 'ADMIN');
          return (
            <article key={item.id} className="approval-item rounded-lg border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs ${item.status === 'pending' ? 'bg-amber-50 text-amber-700' : item.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {statusText[item.status]}
                  </span>
                  <h2 className="mt-2 font-semibold break-words">{item.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.requester.name} · {new Date(item.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
                {item.amount && (
                  <p className="font-semibold">{money(item.amount, item.currency)}</p>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600">
                {item.content}
              </p>
              <ol className="mt-4 flex flex-wrap gap-2">
                {item.steps.map((step, index) => (
                  <li
                    key={step.approverId}
                    className={`rounded border p-2 text-sm ${index === item.currentStep && item.status === 'pending' ? 'border-blue-300 bg-blue-50' : 'bg-gray-50'}`}
                  >
                    <span>
                      {index + 1}. {step.approver.name} ·{' '}
                      {step.action === 'approve'
                        ? '승인'
                        : step.action === 'reject'
                          ? '반려'
                          : item.status === 'cancelled'
                            ? '미진행 · 요청 취소'
                            : item.status === 'rejected'
                              ? '미진행 · 반려 종료'
                              : '대기'}
                    </span>
                    {step.comment && <p className="mt-1 text-xs text-gray-500">{step.comment}</p>}
                    {step.actedAt && (
                      <p className="text-xs text-gray-400">
                        {new Date(step.actedAt).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {canAct && (
                <div className="entrip-no-print mt-4 flex flex-wrap gap-2">
                  <label className="min-w-0 flex-1 text-sm">
                    결재 의견
                    <input
                      className={inputClass}
                      maxLength={500}
                      value={comments[item.id] || ''}
                      onChange={(e) => setComments((p) => ({ ...p, [item.id]: e.target.value }))}
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    {(['approve', 'reject'] as const).map((action) => (
                      <button
                        className={
                          action === 'approve'
                            ? buttonClass
                            : 'rounded-md border border-red-200 px-4 py-2 text-sm text-red-700'
                        }
                        key={action}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await financeRequest(`approvals/${item.id}/action`, {
                              method: 'POST',
                              body: JSON.stringify({
                                action,
                                comment: comments[item.id] || undefined,
                              }),
                            });
                            setNotice(action === 'approve' ? '승인했습니다.' : '반려했습니다.');
                          })
                        }
                      >
                        {action === 'approve' ? '승인' : '반려'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {canCancel && (
                <button
                  className="mt-4 text-sm text-gray-600 underline"
                  disabled={busy}
                  onClick={() => {
                    if (confirm('이 결재 요청을 취소할까요?'))
                      void run(async () => {
                        await financeRequest(`approvals/${item.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ status: 'cancelled' }),
                        });
                        setNotice('결재 요청을 취소했습니다.');
                      });
                  }}
                >
                  요청 취소
                </button>
              )}
            </article>
          );
        })}
      </div>
      {!queryReady && !error && <p role="status">결재 요청을 조회하는 중…</p>}
      {queryReady && !items.length && !error && (
        <p className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500">
          조회된 결재 요청이 없습니다.
        </p>
      )}
      <div className="entrip-no-print flex items-center justify-end gap-3 text-sm">
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
    </section>
  );
}
