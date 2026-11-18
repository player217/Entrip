'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWorkspaceStore } from '@entrip/shared/client';
import { useAuthStore } from '@/lib/auth-store';
import { useTabState } from '@/hooks/useTabState';
import { useCompanyRefresh } from '@/hooks/useCompanyRefresh';
import { useWorkspaceTabKey } from '@/components/workspace/WorkspaceTabContext';
import { BookingEditor } from './BookingEditor';
import BookingWorkspacePrint from './BookingWorkspacePrint';
import { bookingPayload, bookingRequest, BookingRequestError, bookingTypes, dateKey, localDate, makeDraft, statuses, statusStyles, type BookingRecord, type EditorSession } from './booking-model';

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
  const editorAction = useRef(0);
  const currentRecordId = useRef(editor?.record?.id);
  currentRecordId.current = editor?.record?.id;
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
  const refreshBookings = useCallback(async (signal: AbortSignal) => {
    const requestedId = currentRecordId.current;
    const action = editorAction.current;
    const updateDetail = async () => {
      if (!requestedId) return;
      let record: BookingRecord | undefined;
      try {
        const detail = await bookingRequest<{ data: BookingRecord }>(`/${encodeURIComponent(requestedId)}`, { signal });
        record = detail.data;
      } catch (cause) {
        if (!(cause instanceof BookingRequestError) || cause.status !== 404) throw cause;
      }
      if (signal.aborted || action !== editorAction.current) return;
      setEditor(current => {
        // A different booking may have opened or a newer save may have finished during this request.
        if (!current?.record || current.record.id !== requestedId) return current;
        if (record && (record.version < current.record.version || JSON.stringify(current.record) === JSON.stringify(record))) return current;
        if (JSON.stringify(current.draft) !== current.baseline) {
          return { ...current, remoteChange: record ? 'updated' : 'deleted' };
        }
        if (!record) return null;
        const draft = makeDraft(record, selectedDay, user?.name ?? '');
        return { record, draft, baseline: JSON.stringify(draft) };
      });
    };
    await Promise.all([mutate(), updateDetail()]);
  }, [mutate, selectedDay, setEditor, user?.name]);
  useCompanyRefresh(['bookings'], refreshBookings);
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
    editorAction.current += 1;
    const draft = makeDraft(undefined, day, user?.name ?? '');
    setBusy(false); setError(''); setEditor({ draft, baseline: JSON.stringify(draft) });
  };
  const loadDetail = useCallback(async (id: string) => {
    const action = ++editorAction.current;
    setBusy(true); setError('');
    try {
      const response = await bookingRequest<{ data: BookingRecord }>(`/${encodeURIComponent(id)}`);
      if (action !== editorAction.current) return;
      const draft = makeDraft(response.data, selectedDay, user?.name ?? '');
      setEditor({ record: response.data, draft, baseline: JSON.stringify(draft) });
    } catch (cause) { if (action === editorAction.current) setError(cause instanceof Error ? cause.message : '예약을 불러오지 못했습니다.'); }
    finally { if (action === editorAction.current) setBusy(false); }
  }, [selectedDay, setEditor, user?.name]);
  const close = () => { if (!dirty || window.confirm('저장하지 않은 변경 사항을 버리고 닫을까요?')) { editorAction.current += 1; setEditor(null); setError(''); setBusy(false); } };
  const save = async () => {
    if (!editor || editor.remoteChange === 'deleted') return;
    const action = ++editorAction.current;
    setBusy(true); setError('');
    try {
      const result = await bookingRequest<{ data: BookingRecord }>(editor.record ? `/${encodeURIComponent(editor.record.id)}` : '', {
        method: editor.record ? 'PUT' : 'POST', body: JSON.stringify(bookingPayload(editor)),
        headers: editor.record ? { 'If-Match': String(editor.record.version) } : {},
      });
      // A successful write must never leave an old version in the editor if the follow-up read fails.
      const saved = result.data;
      const savedDraft = makeDraft(saved, selectedDay, user?.name ?? '');
      if (action === editorAction.current) setEditor({ record: saved, draft: savedDraft, baseline: JSON.stringify(savedDraft) });
      const detail = await bookingRequest<{ data: BookingRecord }>(`/${encodeURIComponent(saved.id)}`).catch(() => ({ data: saved }));
      const draft = makeDraft(detail.data, selectedDay, user?.name ?? '');
      if (action === editorAction.current) setEditor(current => current?.record && current.record.version > detail.data.version ? current : { record: detail.data, draft, baseline: JSON.stringify(draft) });
      await mutate();
      await mutateCache(cacheKey => Array.isArray(cacheKey) && (cacheKey[0] === 'booking-workspace' || String(cacheKey[0]).includes('/bookings')), undefined, { revalidate: true });
    } catch (cause) { if (action === editorAction.current) setError(cause instanceof Error ? cause.message : '예약을 저장하지 못했습니다.'); }
    finally { if (action === editorAction.current) setBusy(false); }
  };
  const remove = async () => {
    if (!editor?.record || editor.remoteChange === 'deleted' || !window.confirm('이 예약을 삭제할까요? 삭제된 예약은 목록에서 숨겨집니다.')) return;
    const action = ++editorAction.current;
    setBusy(true); setError('');
    try {
      await bookingRequest(`/${encodeURIComponent(editor.record.id)}`, { method: 'DELETE', headers: { 'If-Match': String(editor.record.version) } });
      if (action === editorAction.current) setEditor(null);
      await mutateCache(cacheKey => Array.isArray(cacheKey) && (cacheKey[0] === 'booking-workspace' || String(cacheKey[0]).includes('/bookings')), undefined, { revalidate: true });
    } catch (cause) { if (action === editorAction.current) setError(cause instanceof Error ? cause.message : '예약 삭제 실패'); }
    finally { if (action === editorAction.current) setBusy(false); }
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
  const selectedDayBookings = filtered.filter(booking => dateKey(booking.startDate) <= selectedDay && dateKey(booking.endDate) >= selectedDay);
  const emptyMessage = search.trim() || status ? '검색 조건에 맞는 예약이 없습니다.' : '해당 기간에 예약이 없습니다.';
  const statusBadge = (value: string) => <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[value] ?? statusStyles.PENDING}`}>{statuses[value] ?? value}</span>;
  const passengers = filtered.filter(booking => booking.status !== 'CANCELLED').reduce((sum, booking) => sum + booking.totalPax, 0);
  return <div className="booking-workspace relative flex h-full min-h-[580px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white" data-printable-bookings data-testid={`booking-${view}`}>
    <header className="space-y-3 border-b border-slate-200 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2"><h1 className="mr-auto text-xl font-semibold text-slate-900">{labels[view]}</h1><button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void mutate()}>새로고침</button><button type="button" className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => openNew(selectedDay)}>+ 예약 등록</button></div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="button" aria-label="이전 기간" onClick={() => navigate(-1)} className="shrink-0 rounded border px-3 py-1.5">‹</button>
        <h2 className="min-w-0 flex-1 text-center text-sm font-semibold sm:flex-none sm:text-base">{weekly ? `${period.start} ~ ${period.end}` : `${selectedDay.slice(0, 4)}년 ${Number(selectedDay.slice(5, 7))}월`}</h2>
        <button type="button" aria-label="다음 기간" onClick={() => navigate(1)} className="shrink-0 rounded border px-3 py-1.5">›</button>
        <button type="button" className="shrink-0 rounded border px-3 py-1.5 text-sm" onClick={() => setSelectedDay(localDate(new Date()))}>오늘</button>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2" role="search" aria-label="예약 검색 및 필터">
        <label className="min-w-0"><span className="sr-only">예약 검색</span><input className="block w-full min-w-0 rounded border px-3 py-2 text-sm" placeholder="팀명·고객명·목적지 검색" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="min-w-0"><span className="sr-only">예약 상태 필터</span><select aria-label="예약 상태 필터" className="max-w-full rounded border bg-white px-2 py-2 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="">모든 상태</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
    </header>
    {(loadError || (!editor && error)) && <div role="alert" className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{loadError instanceof Error ? loadError.message : error}<button type="button" onClick={() => void mutate()} className="ml-3 underline">다시 시도</button></div>}
    {isLoading ? <p role="status" className="p-8 text-center text-slate-500">예약을 불러오는 중...</p> : loadError ? <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">예약 자료를 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.</div> : listView ? <>
      <p id={`booking-scroll-${tabKey ?? view}`} className="border-b bg-slate-50 px-4 py-2 text-xs text-slate-500">좌우로 스크롤하면 모든 열을 볼 수 있습니다. 팀명은 왼쪽에 고정됩니다.</p>
      <div className="min-h-0 flex-1 overflow-auto" role="region" aria-label="예약 목록" aria-describedby={`booking-scroll-${tabKey ?? view}`} tabIndex={0}>
        <table className="w-full min-w-[940px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600"><tr>{['팀명 / 고객', '여행 기간', '목적지', '인원', '담당자', '판매금액', '상태'].map((label, index) => <th key={label} className={`whitespace-nowrap border-b bg-slate-50 p-3 font-medium ${index === 0 ? 'sticky left-0 z-30 w-[168px] min-w-[168px] max-w-[168px] border-r' : ''}`}>{label}</th>)}</tr></thead>
          <tbody>{filtered.map(booking => <tr key={booking.id} className="group hover:bg-blue-50"><td className="sticky left-0 z-10 w-[168px] min-w-[168px] max-w-[168px] border-b border-r bg-white p-3 group-hover:bg-blue-50"><button type="button" className="break-words text-left font-medium text-blue-700 underline-offset-2 hover:underline" onClick={() => void loadDetail(booking.id)}>{booking.teamName}</button><p className="mt-1 break-words text-xs text-slate-500">{booking.customerName || '고객 미입력'} · {bookingTypes[booking.type] ?? booking.type}</p></td><td className="whitespace-nowrap border-b p-3 text-xs">{dateKey(booking.startDate)}<br />~ {dateKey(booking.endDate)}</td><td className="border-b p-3">{booking.destination}</td><td className="whitespace-nowrap border-b p-3">{booking.totalPax}명</td><td className="border-b p-3">{booking.coordinator}</td><td className="whitespace-nowrap border-b p-3">{booking.currency} {Number(booking.totalPrice ?? booking.revenue ?? 0).toLocaleString()}</td><td className="border-b p-3">{statusBadge(booking.status)}</td></tr>)}</tbody>
        </table>
        {!filtered.length && <p className="p-10 text-center text-slate-500">{emptyMessage}</p>}
      </div>
    </> : <div className="min-h-0 flex-1 overflow-auto">
      <div className="space-y-3 p-3 lg:hidden" data-testid="booking-day-agenda">
        <p className="text-xs text-slate-500">날짜를 선택하면 아래에서 팀명과 일정을 확인할 수 있습니다.</p>
        <div className="grid grid-cols-7 gap-1" aria-label={weekly ? '주간 날짜 선택' : '월간 날짜 선택'}>
          {weekdays.map((label, index) => <span key={label} className={`py-1 text-center text-xs ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-slate-500'}`}>{label}</span>)}
          {calendarDays.map(day => {
            const count = filtered.filter(booking => dateKey(booking.startDate) <= day && dateKey(booking.endDate) >= day).length;
            const inPeriod = day >= period.start && day <= period.end;
            return <button key={day} type="button" aria-label={`${day} 일정 보기${count ? `, 예약 ${count}건` : ''}`} aria-pressed={day === selectedDay} onClick={() => setSelectedDay(day)} className={`min-w-0 rounded-lg border py-1.5 text-center ${day === selectedDay ? 'border-blue-600 bg-blue-600 text-white' : day === localDate(new Date()) ? 'border-blue-300 bg-blue-50 text-blue-800' : inPeriod ? 'border-slate-200 bg-white text-slate-700' : 'border-transparent bg-slate-50 text-slate-400'}`}><span className="block text-sm font-medium">{Number(day.slice(-2))}</span><span className={`block min-h-[14px] text-[10px] ${day === selectedDay ? 'text-white/90' : 'text-slate-500'}`}>{count ? `${count}건` : '·'}</span></button>;
          })}
        </div>
        <section aria-label="선택한 날짜의 예약" className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{selectedDay} ({weekdays[dayDate(selectedDay).getDay()]}) · {selectedDayBookings.length}건</h3><button type="button" aria-label={`${selectedDay} 예약 등록`} onClick={() => openNew(selectedDay)} className="rounded border border-blue-200 bg-white px-2 py-1.5 text-xs text-blue-700">이 날짜에 등록</button></div>
          <div className="space-y-2">{selectedDayBookings.map(booking => <button key={booking.id} type="button" onClick={() => void loadDetail(booking.id)} className="block w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-blue-50"><span className="mb-2 flex items-start gap-2"><strong className={`min-w-0 flex-1 break-words text-sm ${booking.status === 'CANCELLED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{booking.teamName}</strong>{statusBadge(booking.status)}</span><span className="block break-words text-xs text-slate-600">{booking.destination} · {booking.totalPax}명 · {booking.coordinator}</span><span className="mt-1 block text-xs text-slate-500">{dateKey(booking.startDate)} ~ {dateKey(booking.endDate)}</span></button>)}</div>
          {!selectedDayBookings.length && <p className="py-4 text-center text-sm text-slate-500">{search.trim() || status ? '선택한 날짜에 검색 조건과 일치하는 예약이 없습니다.' : '선택한 날짜에 예약이 없습니다.'}</p>}
        </section>
      </div>
      <div className="hidden lg:block" data-testid="booking-calendar-grid">
        <div className="grid grid-cols-7 border-b bg-slate-50">{weekdays.map((label, index) => <div key={label} className={`p-2 text-center text-xs font-medium ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-slate-600'}`}>{label}</div>)}</div>
        <div className="grid grid-cols-7">{calendarDays.map(day => {
          const dayBookings = filtered.filter(booking => dateKey(booking.startDate) <= day && dateKey(booking.endDate) >= day);
          const inPeriod = day >= period.start && day <= period.end;
          return <div key={day} className={`min-h-[110px] min-w-0 border-b border-r p-2 ${inPeriod ? 'bg-white' : 'bg-slate-50'}`}><button type="button" aria-label={`${day} 예약 등록`} onClick={() => openNew(day)} className={`mb-1 rounded-full px-2 py-1 text-xs ${day === localDate(new Date()) ? 'bg-blue-600 text-white' : inPeriod ? 'text-slate-700 hover:bg-blue-50' : 'text-slate-400'}`}>{Number(day.slice(-2))}</button><div className="space-y-1">{dayBookings.map(booking => <button key={booking.id} type="button" onClick={() => void loadDetail(booking.id)} title={`${booking.teamName} · ${booking.destination} · ${booking.coordinator} · ${statuses[booking.status] ?? booking.status}`} className={`block w-full min-w-0 rounded border-l-2 px-2 py-1 text-left text-xs ${statusStyles[booking.status] ?? statusStyles.PENDING}`}><span className={`block truncate font-medium ${booking.status === 'CANCELLED' ? 'line-through' : ''}`}>{booking.teamName}</span><span className="block truncate">{booking.destination} · {booking.totalPax}명</span><span className="mt-0.5 block text-[10px] font-semibold">{statuses[booking.status] ?? booking.status}</span></button>)}</div></div>;
        })}</div>
      </div>
    </div>}
    <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t bg-slate-50 px-4 py-3 text-xs text-slate-600">{isLoading || loadError ? <span>{loadError ? '조회 실패 · 예약 건수와 합계를 확인할 수 없습니다.' : '예약 건수와 합계를 불러오는 중...'}</span> : <><span>예약 {filtered.length}건 · {passengers}명</span>{Object.entries(totals).map(([currency, amount]) => <span key={currency}>판매 {currency} {amount.toLocaleString()}</span>)}<span className="ml-auto">금액·인원은 취소 예약 제외</span></>}</footer>
    {editor && <BookingEditor session={editor} onChange={draft => setEditor(current => current ? { ...current, draft } : current)} onClose={close} onSave={() => void save()} onDelete={() => void remove()} onReload={() => { if (editor.record && (!dirty || window.confirm('작성 중인 내용을 버리고 최신 예약을 불러올까요?'))) void loadDetail(editor.record.id); }} busy={busy} error={error} />}
    <BookingWorkspacePrint title={labels[view]} period={period} selectedDay={selectedDay} calendarDays={listView ? undefined : calendarDays} search={search} status={status} records={filtered} totals={totals} passengers={passengers} loading={isLoading} loadError={Boolean(loadError)} editor={editor} />
  </div>;
}
