'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { relatedServiceRows, retainedFacts, serviceFields, serviceStartLabels } from './booking-details';
import './booking-editor.css';
import { bookingPrintHtml, bookingHistoryChanges, bookingHistoryFields, bookingTypes, detailSections, statuses, type BookingDraft, type Currency, type DetailItem, type DetailKey, type EditorSession } from './booking-model';

const inputClass = 'block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const currencies: Currency[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY'];
export function BookingEditor({ session, onChange, onClose, onSave, onReload, onDelete, busy, error }: {
  session: EditorSession; onChange: (draft: BookingDraft) => void; onClose: () => void;
  onSave: () => void; onReload: () => void; onDelete: () => void; busy: boolean; error: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const historyPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showHistory) historyPanel.current?.scrollIntoView?.({ block: 'nearest' }); }, [showHistory]);
  const draft = session.draft;
  const formId = useId();
  const focusRow = useRef<string | null>(null);
  const dirty = JSON.stringify(draft) !== session.baseline;
  const deleted = session.remoteChange === 'deleted';
  const items = detailSections.flatMap(({ key }) => draft[key]);
  const savedUnnamed = useMemo(() => {
    const baseline = JSON.parse(session.baseline) as BookingDraft;
    return new Set(detailSections.flatMap(({ key }) => baseline[key].filter(item => !item.name).map(item => item.id)));
  }, [session.baseline]);
  const costTotals = items.reduce<Partial<Record<Currency, number>>>((totals, item) => {
    if (!item.unpriced) totals[item.currency] = (totals[item.currency] ?? 0) + item.quantity * item.unitPrice;
    return totals;
  }, {});
  const linked = relatedServiceRows(session.record);
  const money = (amount: number) => amount.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const field = <K extends keyof BookingDraft>(name: K, value: BookingDraft[K]) => onChange({ ...draft, [name]: value });
  const editItem = (key: DetailKey, id: string, change: Partial<DetailItem>) => field(key, draft[key].map(item => item.id === id ? { ...item, ...change } : item));
  const add = (key: DetailKey) => {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    focusRow.current = id;
    field(key, [...draft[key], { id, name: '', description: '', date: draft.startDate, quantity: 1, unitPrice: 0, unpriced: true, currency: draft.currency }]);
  };
  const remove = (key: DetailKey, index: number) => {
    const rows = draft[key].filter((_, position) => position !== index);
    const target = rows[Math.min(index, rows.length - 1)];
    document.getElementById(target ? `${formId}-${key}-${target.id}` : `${formId}-add-${key}`)?.focus();
    field(key, rows);
  };
  const print = () => {
    const popup = window.open('', '_blank', 'width=900,height=800');
    if (popup) { popup.document.write(bookingPrintHtml(draft, session.record?.bookingNumber, { dirty, deleted, record: session.record })); popup.document.close(); popup.focus(); } else { window.print(); }
  };
  return <div className="booking-editor-stage entrip-no-print"><section role="dialog" aria-modal="false" aria-label={session.record ? '예약 수정' : '새 예약 등록'} className="booking-editor-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-blue-200 shadow-xl"
    onKeyDown={event => { if (event.key === 'Escape' && !busy && !event.nativeEvent.isComposing) { event.stopPropagation(); onClose(); } }}>
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 px-3 py-2.5 sm:px-5">
      <div className="mr-auto min-w-0"><h2 className="text-lg font-semibold text-slate-900">예약 정보</h2><p className="break-all text-xs text-slate-500">{session.record?.bookingNumber ?? '새 예약 등록'}{dirty ? ' · 저장하지 않은 변경 사항' : ''}</p></div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        <button type="button" onClick={onClose} disabled={busy} className="rounded border px-3 py-1.5 text-sm">취소</button>
        <button type="submit" form={formId} disabled={busy || deleted || (!!session.record && !dirty)} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? '저장 중...' : '예약 저장'}</button>
        <button type="button" onClick={print} className="rounded border px-3 py-1.5 text-sm">인쇄</button>
      </div>
    </header>
    <form id={formId} className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); if (!busy && !deleted) onSave(); }}>
      <fieldset disabled={busy} className="m-0 min-h-0 min-w-0 flex-1 overflow-auto border-0 p-0">
        {session.remoteChange && <p role="status" className="m-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {deleted ? '다른 직원이 이 예약을 삭제했습니다. 작성 중인 내용은 이 창에서 확인할 수 있습니다.' : '다른 직원이 이 예약을 수정했습니다. 작성 중인 내용은 보존했습니다. ‘다시 불러오기’로 최신 내용을 확인하세요.'}
        </p>}
        {error && <p role="alert" className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {showHistory && <div ref={historyPanel} className="m-4 rounded border border-slate-200 p-3">
          <h3 className="mb-2 font-medium">저장된 변경 이력</h3>
          {session.record?.history?.length ? <ul className="space-y-3 text-sm">{session.record.history.map(entry => <li key={entry.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="break-words"><strong>{entry.action === 'create' ? '생성' : entry.action === 'delete' ? '삭제' : '수정'}</strong> · {new Date(entry.changedAt).toLocaleString('ko-KR')} · {entry.user?.name ?? '사용자'}</p>
            {entry.action === 'create' ? <p className="mt-1 text-slate-500">예약을 처음 등록했습니다.</p> : <>
              <p className="mt-1 text-slate-600">{bookingHistoryFields(entry.changedFields).join(' · ')}</p>
              <dl className="mt-2 space-y-2 text-xs text-slate-600">{bookingHistoryChanges(entry).filter(change => change.hasValues).map(change =>
                detailSections.some(section => section.label === change.label) ? <div key={change.label}>
                  <dt className="sr-only">{change.label}</dt>
                  <dd><details className="rounded border border-slate-200 bg-slate-50 p-2">
                    <summary className="cursor-pointer rounded py-1 font-medium text-blue-700">{change.label} 변경 전후 항목 보기</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {([{ label: '변경 전', value: change.before }, { label: '변경 후', value: change.after }]).map(side => <div key={side.label} className="min-w-0 rounded border border-slate-200 bg-white p-2">
                        <p className="mb-1 font-semibold text-slate-800">{side.label}</p>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{side.value}</p>
                      </div>)}
                    </div>
                  </details></dd>
                </div> : <div key={change.label} className="grid grid-cols-[70px_minmax(0,1fr)] gap-2">
                  <dt>{change.label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{change.before} → {change.after}</dd>
                </div>
              )}</dl>
            </>}
          </li>)}</ul> : <p className="text-sm text-slate-500">기록된 변경 이력이 없습니다.</p>}
        </div>}
        <div className="booking-editor-columns min-w-0">
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <section><h3 className="mb-3 border-b pb-2 font-semibold text-blue-800">기본 정보</h3><div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">팀명 *<input className={inputClass} value={draft.teamName} onChange={e => field('teamName', e.target.value)} required maxLength={200} /></label>
              <label className="text-sm">예약 유형<select aria-label="예약 유형" className={inputClass} value={draft.type} onChange={e => field('type', e.target.value)}>{Object.entries(bookingTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm">예약 상태<select aria-label="예약 상태" className={inputClass} value={draft.status} onChange={e => field('status', e.target.value)}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="col-span-2 text-sm">팀 유형<input className={inputClass} value={draft.teamType ?? ''} maxLength={200} onChange={e => field('teamType', e.target.value)} /></label>
              <label className="text-sm">출발지 *<input className={inputClass} value={draft.origin} onChange={e => field('origin', e.target.value)} required /></label>
              <label className="text-sm">목적지 *<input className={inputClass} value={draft.destination} onChange={e => field('destination', e.target.value)} required /></label>
              <label className="text-sm">출발일 *<input className={inputClass} type="date" value={draft.startDate} onChange={e => field('startDate', e.target.value)} required /></label>
              <label className="text-sm">귀국일 *<input className={inputClass} type="date" min={draft.startDate} value={draft.endDate} onChange={e => field('endDate', e.target.value)} required /></label>
              <label className="text-sm">인원 *<input className={inputClass} type="number" min={1} max={100000} value={draft.totalPax} onChange={e => field('totalPax', Number(e.target.value))} required /></label>
              <label className="text-sm">담당자 *<input className={inputClass} value={draft.coordinator} onChange={e => field('coordinator', e.target.value)} required /></label>
            </div></section>
            <section><h3 className="mb-3 border-b pb-2 font-semibold text-blue-800">고객 정보</h3><div className="grid grid-cols-2 gap-3">
              <label className="text-sm">고객명<input className={inputClass} value={draft.customerName} onChange={e => field('customerName', e.target.value)} /></label>
              <label className="text-sm">대표자<input className={inputClass} value={draft.representative} onChange={e => field('representative', e.target.value)} /></label>
              <label className="col-span-2 text-sm">연락처<input className={inputClass} type="tel" value={draft.contact} onChange={e => field('contact', e.target.value)} /></label>
              <label className="col-span-2 text-sm">이메일<input className={inputClass} type="email" value={draft.email} onChange={e => field('email', e.target.value)} /></label>
            </div></section>
            <section><h3 className="mb-3 border-b pb-2 font-semibold text-blue-800">금액</h3><div className="grid grid-cols-2 gap-3">
              <label className="text-sm">판매금액<input className={inputClass} type="number" min={0} step="0.01" value={draft.revenue} onChange={e => field('revenue', Number(e.target.value))} required /></label>
              <label className="text-sm">통화<select aria-label="통화" className={inputClass} value={draft.currency} onChange={e => field('currency', e.target.value as Currency)}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="text-sm">입금액<input className={inputClass} type="number" min={0} step="0.01" value={draft.depositAmount} onChange={e => field('depositAmount', Number(e.target.value))} required /></label>
              <div className="text-sm">잔액<p className="py-2 font-semibold">{draft.currency} {(draft.revenue - draft.depositAmount).toLocaleString()}</p></div>
            </div></section>
            {Boolean(session.record?.settlements?.length) && <section><h3 className="mb-2 border-b pb-2 font-semibold text-blue-800">연결된 정산</h3><ul className="space-y-1 text-sm">{session.record?.settlements?.map(row => <li key={row.id} className="rounded border p-2"><strong>{row.type.toUpperCase() === 'INCOME' ? '입금' : '출금'} · {row.currency} {money(Number(row.amount))}</strong>{row.quantity != null && <span> · 수량 {row.quantity}</span>}{row.unitPrice != null && <span> · 단가 {money(Number(row.unitPrice))}</span>}{row.exchangeRate != null && <span> · 환율 {Number(row.exchangeRate).toLocaleString('ko-KR', {maximumFractionDigits: 8})}</span>}{row.memo && <p className="whitespace-pre-wrap break-words">{row.memo}</p>}</li>)}</ul></section>}
            <label className="block text-sm">메모<textarea className={inputClass} rows={3} maxLength={20000} value={draft.notes} onChange={e => field('notes', e.target.value)} /></label>
          </fieldset>
          <div className="booking-editor-services min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2"><h3 className="font-semibold text-blue-800">여행 항목 및 예상 원가</h3>
              {items.length > 0 && <p className="break-words text-right text-xs font-medium text-slate-600">항목 {items.length}건{Object.entries(costTotals).map(([code, sum]) => <span key={code}> · {code} {money(sum!)}</span>)}{items.some(item => item.unpriced) && ' · 단가 미입력 있음'}</p>}
            </div>
            {detailSections.map(({ key, label }) => <section key={key} aria-label={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-slate-800">{label} <span className="text-xs font-normal text-slate-500">{draft[key].length}건</span></h4><button id={`${formId}-add-${key}`} type="button" disabled={busy || draft[key].length >= 100} onClick={() => add(key)} className="rounded border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-700 disabled:opacity-50">+ {label} 추가</button></div>
            <div className="space-y-3">{draft[key].map((item, index) => <fieldset key={item.id} disabled={busy} className="mt-2 min-w-0 rounded border border-slate-200 bg-white p-3"><legend className="px-1 text-sm font-medium">{label} {index + 1}</legend>
              <div className="booking-editor-service-fields">
                <label className="col-span-full text-xs">{label}명<input id={`${formId}-${key}-${item.id}`} ref={element => { if (element && focusRow.current === item.id) { focusRow.current = null; element.focus(); } }} className={inputClass} value={item.name} onChange={e => editItem(key, item.id, { name: e.target.value })} maxLength={200} required={!savedUnnamed.has(item.id)} /></label>
                <label className="text-xs">{serviceStartLabels[key]}<input className={inputClass} type="date" value={item.date ?? ''} onChange={e => editItem(key, item.id, { date: e.target.value })} /></label>
                {serviceFields[key].map(f => <label key={f.key} className="min-w-0 text-xs">{f.label}<input className={inputClass} type={f.type} value={item.fields?.[f.key] ?? ''}
                  min={f.type === 'date' ? item.date || undefined : f.type === 'number' ? 0 : undefined} max={f.type === 'number' ? 999999 : undefined} maxLength={f.type === 'text' ? 500 : undefined}
                  onChange={e => editItem(key, item.id, { fields: { ...item.fields, [f.key]: e.target.value } })} /></label>)}
                <label className="col-span-full text-xs">{label} 상세<textarea className={inputClass} rows={2} maxLength={2000} value={item.description ?? ''} onChange={e => editItem(key, item.id, { description: e.target.value })} /></label>
                <label className="text-xs">{label} 수량<input className={inputClass} type="number" min={1} max={100000} value={item.quantity} onChange={e => editItem(key, item.id, { quantity: Number(e.target.value) })} required /></label>
                <label className="text-xs">{label} 단가<input className={inputClass} type="number" min={0} step="0.01" value={item.unpriced ? '' : item.unitPrice} onChange={e => editItem(key, item.id, { unitPrice: Number(e.target.value), unpriced: e.target.value === '' })} /></label>
                <label className="text-xs">{label} 통화<select aria-label={`${label} 통화`} className={inputClass} value={item.currency} onChange={e => editItem(key, item.id, { currency: e.target.value as Currency })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
              </div>
              {item.legacyExtra && <dl className="mt-2 border-t pt-2 text-xs text-slate-600">{retainedFacts(item).map(fact => <div key={fact.label} className="break-words"><dt className="inline font-medium">{fact.label} </dt><dd className="inline">{fact.value}</dd></div>)}</dl>}
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                <button type="button" aria-label={`${label} ${index + 1} 삭제`} onClick={() => remove(key, index)} className="rounded px-2 py-1.5 text-sm text-red-600">삭제</button>
                <p className="text-right text-sm"><span className="mr-2 text-xs text-slate-500">예상 원가</span><b>{item.unpriced ? '단가 미입력' : `${item.currency} ${money(item.unitPrice * item.quantity)}`}</b></p>
              </div>
            </fieldset>)}</div>
          </section>)}
            {linked.length > 0 && <section><h4 className="mb-2 border-b pb-2 font-medium text-blue-800">연결된 수배</h4>{linked.map(row => <details key={row.id} className="mb-2 rounded border p-2 text-sm"><summary className="cursor-pointer">{row.label} · {row.title}</summary><dl className="mt-2 grid grid-cols-2 gap-2">{row.facts.map(fact => <div key={fact.label}><dt className="text-xs text-slate-500">{fact.label}</dt><dd className="whitespace-pre-wrap break-words">{fact.value}</dd></div>)}</dl></details>)}</section>}
          </div>
        </div>
      </fieldset>
      {session.record && <footer className="flex flex-wrap items-center justify-between gap-1 border-t bg-slate-50 px-3 py-1.5 text-xs">
        <div className="flex gap-2"><button type="button" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory} className="rounded px-2 py-1.5 text-blue-700">변경 이력</button>
        <button type="button" onClick={onReload} disabled={busy || deleted} className="rounded px-2 py-1.5">다시 불러오기</button></div>
        <button type="button" onClick={onDelete} disabled={busy || deleted} className="rounded px-2 py-1.5 text-red-600">예약 삭제</button>
      </footer>}
    </form>
  </section></div>;
}
