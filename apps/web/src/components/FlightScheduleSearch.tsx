'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { KOREAN_AIRPORTS, getAirportByCode, flightAPI, type ScheduleResponse } from '@entrip/shared';

const weekdays = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']] as const;

export function FlightScheduleSearch() {
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (!departure) return;
    setLoading(true);
    setError(null);
    flightAPI.getSchedule(departure).then((data) => {
      if (!active) return;
      if (!Array.isArray(data.flights)) throw new Error('Invalid schedule');
      setSchedule(data);
    }).catch(() => {
      if (active) setError('항공편 데이터를 갱신하지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [departure, revision]);

  const destinations = useMemo(() => [...new Set((schedule?.flights || []).map(f => f.destination?.trim()).filter(code => /^[A-Z]{3}$/.test(code)))].sort(), [schedule]);
  const flights = useMemo(() => (schedule?.flights || []).filter(f => f.destination?.trim() === arrival).sort((a, b) => a.departureTime.localeCompare(b.departureTime)), [schedule, arrival]);
  const airlines = [...new Set(flights.map(f => f.airline))];
  const stale = schedule && (schedule.stale || !Number.isFinite(Date.parse(schedule.crawledAt)) || Date.now() - Date.parse(schedule.crawledAt) > 86400000);

  return <div className="p-3 md:p-6 min-w-0">
    <div className="flex flex-wrap justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold">항공편 스케줄 조회</h1>
      <button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!departure || loading} onClick={() => setRevision(v => v + 1)}>새로고침</button>
    </div>
    <p className="text-sm text-gray-500 mb-4">출발·도착 공항을 선택하면 항공사별 요일 시간표를 확인할 수 있습니다. 시간은 각 공항 현지 시각입니다.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <label className="text-sm font-medium">출발 공항
        <select aria-label="출발 공항" className="block mt-2 w-full p-2 border rounded" value={departure} onChange={e => { setDeparture(e.target.value); setArrival(''); setSchedule(null); setError(null); setLoading(false); }}>
          <option value="">출발 공항을 선택하세요</option>
          {KOREAN_AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">도착 공항
        <select aria-label="도착 공항" className="block mt-2 w-full p-2 border rounded" value={arrival} onChange={e => setArrival(e.target.value)} disabled={!departure || !destinations.length}>
          <option value="">{loading ? '불러오는 중…' : '도착 공항을 선택하세요'}</option>
          {destinations.map(code => <option key={code} value={code}>{code} - {getAirportByCode(code)?.name || code}</option>)}
        </select>
      </label>
    </div>
    {error && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}{schedule && ' 아래에는 이전에 불러온 자료가 표시됩니다.'}</p>}
    {loading && <p role="status" className="py-4 text-blue-600">스케줄을 불러오는 중…</p>}
    {schedule && <p className={`mb-4 text-sm ${stale ? 'text-amber-700' : 'text-gray-600'}`}>자료 기준: {new Date(schedule.crawledAt).toLocaleString('ko-KR')} · {schedule.source || '연결된 항공편 서버'}{stale && ' · 오래된 자료입니다. 현재 운항은 항공사에서 확인하세요.'}</p>}
    {arrival && flights.length > 0 && <>
      <h2 className="font-semibold mb-3">{departure} → {arrival} · {flights.length}개 항공편</h2>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full min-w-[850px] text-sm bg-white">
          <thead className="bg-blue-50"><tr><th className="p-3 border-b text-left">항공사</th>{weekdays.map(([key, day]) => <th key={key} className="p-3 border-b">{day}</th>)}</tr></thead>
          <tbody>{airlines.map(airline => <tr key={airline}>
            <th className="p-3 border-b text-left align-top">{airline}</th>
            {weekdays.map(([key]) => <td key={key} className="p-2 border-b align-top">{flights.filter(f => f.airline === airline && f.days?.[key]).map((f, i) => <div key={`${f.flightNo}-${f.departureTime}-${i}`} className="mb-2 rounded bg-gray-50 p-2"><p className="font-medium">{f.departureTime} → {f.arrivalTime || '미제공'}</p><p className="text-xs text-gray-500">{f.flightNo}</p></div>)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {flights.some(f => !f.days) && <p className="text-sm text-amber-700 mt-3">요일 정보가 없는 항공편은 요일 칸에 표시하지 않습니다.</p>}
    </>}
    {!loading && !error && schedule && !destinations.length && <p className="py-6 text-gray-500">제공된 자료에 운항 노선이 없습니다.</p>}
    {!loading && !error && arrival && !flights.length && <p className="py-6 text-gray-500">선택한 노선의 스케줄이 없습니다.</p>}
  </div>;
}
