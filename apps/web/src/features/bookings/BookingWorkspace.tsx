'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWorkspaceStore } from '@entrip/shared/client';
import { useAuthStore } from '@/lib/auth-store';
import { useTabState } from '@/hooks/useTabState';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';
import { BookingEditor } from './BookingEditor';
import { bookingPayload, bookingRequest, bookingTypes, dateKey, localDate, makeDraft, statuses, type BookingRecord, type EditorSession } from './booking-model';

export type BookingView = 'month' | 'week' | 'month-list' | 'week-list';
const labels: Record<BookingView, string> = { month: '월간 캘린더', week: '주간 캘린더', 'month-list': '월간 목록', 'week-list': '주간 목록' };
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const dayDate = (day: string) => new Date(`${day}T12:00:00`);
const shiftDay = (day: string, amount: number) => { const d = dayDate(day); d.setDate(d.getDate() + amount); return localDate(d); };
const blankSession: EditorSession | null = null;

export function BookingWorkspace({ view }: { view: BookingView }) {
  const user = useAuthStore(state => state.user);
  const tabKey = useWorkspaceTabKey();
  const [selectedDay, setSelectedDay] = useTabState(localDate(new Date()), `bookingDate:${view}`);
  const [search, setSearch] = useTabState('', `bookingSearch:${view}`);
  const [status, setStatus] = useTabState('', `bookingStatus:${view}`);
  const [editor, setEditor] = useTabState<EditorSession | null>(blankSession, 'bookingEditor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { mutate: mutateCache } = useSWRConfig();
  const weekly = view.startsWith('week');
  const listView = view.endsWith('list');
  const period = useMemo(() => {
    const selected = dayDate(selectedDay);
    let first: Date;
    let last: Date;
    if (weekly) {
      first = new Date(selected); first.setDate(first.getDate() - first.getDay());
      last = new Date(first); last.setDate(last.getDate() + 6);
    } else {
      first = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
      last = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12);
    }
    return { start: localDate(first), end: localDate(last) };
  }, [selectedDay, weekly]);
  const key = user ? ['booking-workspace', user.companyCode, user.id, period.start, period.end] : null;
  const { data: bookings = [], error: loadError, isLoading, mutate } = useSWR<BookingRecord[]>(key, async () => {
    const result: BookingRecord[] = [];
    const seen = new Set<string>();
    let total = Infinity;
    for (let page = 1; result.length < total; page += 1) {
      const query = new URLSearchParams({ startDate: period.start, endDate: period.end, limit: '100', page: String(page), orderBy: 'startDate', order: 'asc' });
      const response = await bookingRequest<{ data: BookingRecord[]; pagination: { total: number } }>(`?${query}`);
      total = response.pagination.total;
      const fresh = response.data.filter(booking => !seen.has(booking.id));
      if (result.length < total && !fresh.length) throw new Error('전체 예약을 불러오지 못했습니다. 다시 시도해주세요.');
      fresh.forEach(booking => seen.add(booking.id));
      result.push(...fresh);
    }
    return result;
  }, { revalidateOnFocus: true, dedupingInterval: 5000 });
  const dirty = Boolean(editor && JSON.stringify(editor.draft) !== editor.baseline);
  useEffect(() => { if (tabKey) useWorkspaceStore.getState().updateTabState(tabKey, { isDirty: dirty }); }, [dirty, tabKey]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const filtered = bookings.filter(booking => (!status || booking.status === status) && [booking.teamName, booking.customerName, booking.destination, booking.coordinator, booking.bookingNumber].some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase())));
  const openNew = (day: string) => {
    const draft = makeDraft(undefined, day, user?.name ?? '');
    setError(''); setEditor({ draft, baseline: JSON.stringify(draft) });
  };
  const loadDetail = useCallback(async (id: string) => {
    setBusy(true); setError('');
    try {
      const response = await bookingRequest<{ data: BookingRecord }>(`/${encodeURIComponent(id)}`);
      const draft = makeDraft(response.data, selectedDay, user?.name ?? '');
      setEditor({ record: response.data, draft, baseline: JSON.stringify(draft) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '예약을 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }, [selectedDay, setEditor, user?.name]);
  const close = () => { if (!dirty || window.confirm('저장하지 않은 변경 사항을 버리고 닫을까요?')) { setEditor(null); setError(''); } };
  const save = async () => {
    if (!editor) return;
    setBusy(true); setError('');
    try {
      const result = await bookingRequest<{ data: BookingRecord }>(editor.record ? `/${encodeURIComponent(editor.record.id)}` : '', {
        method: editor.record ? 'PUT' : 'POST', body: JSON.stringify(bookingPayload(editor)),
        headers: editor.record ? { 'If-Match': String(editor.record.version) } : {},
      });
      const detail = await bookingRequest<{ data: BookingRecord }>(`/${encodeURIComponent(result.data.id)}`);
      const draft = makeDraft(detail.data, selectedDay, user?.name ?? '');
      setEditor({ record: detail.data, draft, baseline: JSON.stringify(draft) });
      await mutate();
      await mutateCache(cacheKey => Array.isArray(cacheKey) && (cacheKey[0] === 'booking-workspace' || String(cacheKey[0]).includes('/bookings')), undefined, { revalidate: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '예약을 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  };
  const navigate = (direction: number) => {
    if (weekly) setSelectedDay(shiftDay(selectedDay, direction * 7));
    else { const d = dayDate(selectedDay); d.setDate(1); d.setMonth(d.getMonth() + direction); setSelectedDay(localDate(d)); }
  };
  const calendarDays = useMemo(() => {
    const start = weekly ? period.start : shiftDay(period.start, -dayDate(period.start).getDay());
    const length = weekly ? 7 : Math.ceil((dayDate(period.start).getDay() + dayDate(period.end).getDate()) / 7) * 7;
    return Array.from({ length }, (_, index) => shiftDay(start, index));
  }, [period, weekly]);
  const totals = filtered.filter(booking => booking.status !== 'CANCELLED').reduce<Record<string, number>>((sum, booking) => {
    sum[booking.currency] = (sum[booking.currency] ?? 0) + Number(booking.totalPrice ?? booking.revenue ?? 0); return sum;
  }, {});
  return <div className="relative flex h-full min-h-[580px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white" data-testid={`booking-${view}`}>
    <header className="space-y-3 border-b border-slate-200 p-4">
      <div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-xl font-semibold text-slate-900">{labels[view]}</h1><button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void mutate()}>새로고침</button><button type="button" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => openNew(selectedDay)}>+ 예약 등록</button></div>
      <div className="flex flex-wrap items-center gap-2"><button type="button" aria-label="이전 기간" onClick={() => navigate(-1)} className="rounded border px-3 py-1.5">‹</button><h2 className="min-w-[120px] text-center font-semibold">{weekly ? `${period.start} ~ ${period.end}` : `${selectedDay.slice(0, 4)}년 ${Number(selectedDay.slice(5, 7))}월`}</h2><button type="button" aria-label="다음 기간" onClick={() => navigate(1)} className="rounded border px-3 py-1.5">›</button><button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => setSelectedDay(localDate(new Date()))}>오늘</button><label className="min-w-0 flex-1 sm:ml-auto"><span className="sr-only">예약 검색</span><input className="w-full min-w-[140px] rounded border px-3 py-2 text-sm" placeholder="팀명·고객명·목적지 검색" value={search} onChange={event => setSearch(event.target.value)} /></label><label><span className="sr-only">예약 상태 필터</span><select className="rounded border bg-white px-3 py-2 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="">모든 상태</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    </header>
    {(loadError || (!editor && error)) && <div role="alert" className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{loadError instanceof Error ? loadError.message : error}<button type="button" onClick={() => void mutate()} className="ml-3 underline">다시 시도</button></div>}
    {isLoading ? <p className="p-8 text-center text-slate-500">예약을 불러오는 중...</p> : listView ? <div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr>{['팀명 / 고객', '여행 기간', '목적지', '인원', '담당자', '판매금액', '상태'].map(label => <th key={label} className="whitespace-nowrap border-b p-3 font-medium">{label}</th>)}</tr></thead><tbody>{filtered.map(booking => <tr key={booking.id} className="border-b hover:bg-blue-50"><td className="p-3"><button type="button" className="text-left font-medium text-blue-700 underline-offset-2 hover:underline" onClick={() => void loadDetail(booking.id)}>{booking.teamName}</button><p className="text-xs text-slate-500">{booking.customerName || '고객 미입력'} · {bookingTypes[booking.type] ?? booking.type}</p></td><td className="whitespace-nowrap p-3 text-xs">{dateKey(booking.startDate)}<br />~ {dateKey(booking.endDate)}</td><td className="p-3">{booking.destination}</td><td className="p-3">{booking.totalPax}명</td><td className="p-3">{booking.coordinator}</td><td className="whitespace-nowrap p-3">{booking.currency} {Number(booking.totalPrice ?? booking.revenue ?? 0).toLocaleString()}</td><td className="p-3">{statuses[booking.status] ?? booking.status}</td></tr>)}</tbody></table>{!filtered.length && <p className="p-12 text-center text-slate-500">해당 기간에 예약이 없습니다.</p>}</div> : <div className="min-h-0 flex-1 overflow-auto"><div className="grid grid-cols-7 border-b bg-slate-50">{weekdays.map((label, index) => <div key={label} className={`p-2 text-center text-xs font-medium ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{label}</div>)}</div><div className="grid grid-cols-7">{calendarDays.map(day => {
      const dayBookings = filtered.filter(booking => dateKey(booking.startDate) <= day && dateKey(booking.endDate) >= day);
      const inPeriod = day >= period.start && day <= period.end;
      return <div key={day} className={`min-h-[110px] min-w-0 border-b border-r p-1 sm:p-2 ${inPeriod ? 'bg-white' : 'bg-slate-50'}`}><button type="button" aria-label={`${day} 예약 등록`} onClick={() => openNew(day)} className={`mb-1 rounded-full px-2 py-1 text-xs ${day === localDate(new Date()) ? 'bg-blue-600 text-white' : inPeriod ? 'text-slate-700 hover:bg-blue-50' : 'text-slate-400'}`}>{Number(day.slice(-2))}</button><div className="space-y-1">{dayBookings.map(booking => <button key={booking.id} type="button" onClick={() => void loadDetail(booking.id)} title={`${booking.teamName} · ${booking.destination} · ${booking.coordinator}`} className={`block w-full min-w-0 rounded border-l-2 px-1 py-1 text-left text-[10px] sm:px-2 sm:text-xs ${booking.status === 'CANCELLED' ? 'border-slate-400 bg-slate-100 text-slate-500 line-through' : booking.status === 'CONFIRMED' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-amber-400 bg-amber-50 text-slate-700'}`}><span className="block truncate font-medium">{booking.teamName}</span><span className="hidden truncate sm:block">{booking.destination} · {booking.totalPax}명</span></button>)}</div></div>;
    })}</div></div>}
    <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-slate-50 px-4 py-3 text-xs text-slate-600"><span>예약 {filtered.length}건 · {filtered.filter(booking => booking.status !== 'CANCELLED').reduce((sum, booking) => sum + booking.totalPax, 0)}명</span>{Object.entries(totals).map(([currency, amount]) => <span key={currency}>판매 {currency} {amount.toLocaleString()}</span>)}<span className="ml-auto">금액·인원은 취소 예약 제외</span></footer>
    {editor && <BookingEditor session={editor} onChange={draft => setEditor({ ...editor, draft })} onClose={close} onSave={() => void save()} onReload={() => { if (editor.record && (!dirty || window.confirm('작성 중인 내용을 버리고 최신 예약을 불러올까요?'))) void loadDetail(editor.record.id); }} busy={busy} error={error} />}
  </div>;
}
