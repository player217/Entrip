'use client';

import { useState } from 'react';
import { bookingPrintHtml, bookingTypes, detailSections, statuses, type BookingDraft, type Currency, type DetailItem, type DetailKey, type EditorSession } from './booking-model';

const inputClass = 'block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const currencies: Currency[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY'];
export function BookingEditor({ session, onChange, onClose, onSave, onReload, busy, error }: {
  session: EditorSession; onChange: (draft: BookingDraft) => void; onClose: () => void;
  onSave: () => void; onReload: () => void; busy: boolean; error: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const draft = session.draft;
  const field = <K extends keyof BookingDraft>(name: K, value: BookingDraft[K]) => onChange({ ...draft, [name]: value });
  const editItem = (key: DetailKey, id: string, change: Partial<DetailItem>) => field(key, draft[key].map(item => item.id === id ? { ...item, ...change } : item));
  const add = (key: DetailKey) => field(key, [...draft[key], { id: crypto.randomUUID(), name: '', description: '', date: draft.startDate, quantity: 1, unitPrice: 0, currency: draft.currency }]);
  const print = () => {
    const popup = window.open('', '_blank', 'width=900,height=800');
    if (popup) { popup.document.write(bookingPrintHtml(draft, session.record?.bookingNumber)); popup.document.close(); popup.focus(); }
  };
  return <section role="dialog" aria-modal="false" aria-label={session.record ? '예약 수정' : '새 예약 등록'} className="absolute inset-0 z-30 flex min-h-0 flex-col rounded-xl border border-blue-200 bg-white shadow-xl">
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <div className="mr-auto"><h2 className="text-lg font-semibold text-slate-900">{session.record ? '예약 수정' : '새 예약 등록'}</h2><p className="text-xs text-slate-500">{session.record?.bookingNumber ?? '기본 정보와 여행 항목을 입력하세요'}</p></div>
      {session.record && <><button type="button" onClick={() => setShowHistory(!showHistory)} className="rounded border px-3 py-1.5 text-sm">변경 이력</button><button type="button" onClick={onReload} disabled={busy} className="rounded border px-3 py-1.5 text-sm">다시 불러오기</button></>}
      <button type="button" onClick={print} className="rounded border px-3 py-1.5 text-sm">인쇄</button>
      <button type="button" onClick={onClose} disabled={busy} aria-label="예약 편집 닫기" className="rounded px-3 py-1.5 text-xl hover:bg-slate-100">×</button>
    </header>
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); onSave(); }}>
      <div className="min-h-0 flex-1 overflow-auto">
        {error && <p role="alert" className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {showHistory && <div className="m-4 rounded border border-slate-200 p-3"><h3 className="mb-2 font-medium">저장된 변경 이력</h3>{session.record?.history?.length ? <ul className="space-y-2 text-sm">{session.record.history.map(entry => <li key={entry.id}><strong>{entry.action === 'create' ? '생성' : '수정'}</strong> · {new Date(entry.changedAt).toLocaleString('ko-KR')} · {entry.user?.name ?? '사용자'}<span className="ml-2 text-slate-500">{entry.changedFields.join(', ')}</span></li>)}</ul> : <p className="text-sm text-slate-500">기록된 변경 이력이 없습니다.</p>}</div>}
        <div className="grid min-w-0 gap-6 p-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]">
          <div className="min-w-0 space-y-5">
            <section><h3 className="mb-3 border-b pb-2 font-semibold text-blue-800">기본 정보</h3><div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">팀명 *<input className={inputClass} value={draft.teamName} onChange={e => field('teamName', e.target.value)} required maxLength={200} /></label>
              <label className="text-sm">예약 유형<select className={inputClass} value={draft.type} onChange={e => field('type', e.target.value)}>{Object.entries(bookingTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm">예약 상태<select className={inputClass} value={draft.status} onChange={e => field('status', e.target.value)}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
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
              <label className="text-sm">통화<select className={inputClass} value={draft.currency} onChange={e => field('currency', e.target.value as Currency)}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="text-sm">입금액<input className={inputClass} type="number" min={0} step="0.01" value={draft.depositAmount} onChange={e => field('depositAmount', Number(e.target.value))} required /></label>
              <div className="text-sm">잔액<p className="py-2 font-semibold">{draft.currency} {(draft.revenue - draft.depositAmount).toLocaleString()}</p></div>
            </div></section>
            <label className="block text-sm">메모<textarea className={inputClass} rows={4} value={draft.notes} onChange={e => field('notes', e.target.value)} /></label>
          </div>
          <div className="min-w-0 space-y-5">{detailSections.map(({ key, label }) => <section key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-blue-800">{label}</h3><button type="button" onClick={() => add(key)} className="rounded border border-blue-200 bg-white px-3 py-1 text-sm text-blue-700">+ {label} 추가</button></div>
            {!draft[key].length && <p className="py-4 text-center text-sm text-slate-500">{label} 항목을 추가하세요.</p>}
            <div className="space-y-3">{draft[key].map((item, index) => <fieldset key={item.id} className="min-w-0 rounded border border-slate-200 bg-white p-3"><legend className="px-1 text-sm">{label} {index + 1}</legend>
              <div className="grid min-w-0 grid-cols-2 gap-2">
                <label className="col-span-2 text-xs">{label}명<input className={inputClass} value={item.name} onChange={e => editItem(key, item.id, { name: e.target.value })} required /></label>
                <label className="col-span-2 text-xs">{label} 상세<input className={inputClass} value={item.description ?? ''} onChange={e => editItem(key, item.id, { description: e.target.value })} /></label>
                <label className="col-span-2 text-xs">{label} 이용일<input className={inputClass} type="date" value={item.date ?? ''} onChange={e => editItem(key, item.id, { date: e.target.value })} /></label>
                <label className="text-xs">{label} 수량<input className={inputClass} type="number" min={1} value={item.quantity} onChange={e => editItem(key, item.id, { quantity: Number(e.target.value) })} required /></label>
                <label className="text-xs">{label} 단가<input className={inputClass} type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => editItem(key, item.id, { unitPrice: Number(e.target.value) })} required /></label>
                <label className="text-xs">{label} 통화<select className={inputClass} value={item.currency} onChange={e => editItem(key, item.id, { currency: e.target.value as Currency })}>{currencies.map(c => <option key={c}>{c}</option>)}</select></label>
                <div className="flex items-end justify-end"><button type="button" aria-label={`${label} ${index + 1} 삭제`} onClick={() => field(key, draft[key].filter(row => row.id !== item.id))} className="rounded px-2 py-2 text-sm text-red-600">삭제</button></div>
              </div><p className="mt-2 text-right text-sm font-medium">{item.currency} {(item.unitPrice * item.quantity).toLocaleString()}</p>
            </fieldset>)}</div>
            {!!session.record?.[key] && !Array.isArray(session.record[key]) && <p className="mt-2 text-xs text-slate-600">기존 형식의 상세 정보는 그대로 보존됩니다. 이 항목을 수정하면 새 형식으로 저장됩니다.</p>}
          </section>)}</div>
        </div>
      </div>
      <footer className="flex items-center justify-end gap-2 border-t bg-slate-50 px-4 py-3"><span className="mr-auto text-xs text-slate-500">{JSON.stringify(draft) !== session.baseline ? '저장하지 않은 변경 사항' : '변경 사항 없음'}</span><button type="button" onClick={onClose} disabled={busy} className="rounded border bg-white px-4 py-2 text-sm">닫기</button><button type="submit" disabled={busy} className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? '저장 중...' : '예약 저장'}</button></footer>
    </form>
  </section>;
}
