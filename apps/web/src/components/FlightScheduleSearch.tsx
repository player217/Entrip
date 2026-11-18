'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { KOREAN_AIRPORTS, getAirportByCode, getInternationalAirportByCode, flightAPI, type ScheduleResponse } from '@entrip/shared';

const weekdays = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']] as const;
const selectClassName = 'block mt-2 w-full p-2 border border-gray-300 rounded bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed';
const airportLabel = (code: string) => {
  const airport = getAirportByCode(code) || getInternationalAirportByCode(code);
  return airport ? `${code} - ${airport.name}` : code;
};

type Flight = ScheduleResponse['flights'][number];

// Bound the height of a printed airline row so the seven weekday cells stay together at a page break.
const flightsPerPrintedCell = 4;

function FlightTimes({ flights }: { flights: Flight[] }) {
  return <>{flights.map((flight, i) => (
    <div key={`${flight.flightNo}-${flight.departureTime}-${i}`} className="flight-slot mb-2 rounded bg-gray-50 p-2">
      <p className="font-medium">{flight.departureTime} → {flight.arrivalTime || '미제공'}</p>
      <p className="text-xs text-gray-500">{flight.flightNo}</p>
    </div>
  ))}</>;
}

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
  const timetables = useMemo(() => {
    const byAirline = new Map<string, Flight[]>();
    flights.forEach(flight => {
      const rows = byAirline.get(flight.airline);
      if (rows) rows.push(flight);
      else byAirline.set(flight.airline, [flight]);
    });
    return Array.from(byAirline, ([airline, rows]) => {
      const days = weekdays.map(([key]) => rows.filter(flight => flight.days?.[key]));
      const segments = Math.max(1, ...days.map(day => Math.ceil(day.length / flightsPerPrintedCell)));
      const incompleteDays = rows.some(flight => !flight.days || !Object.keys(flight.days).length);
      return { airline, days, segments, incompleteDays };
    });
  }, [flights]);
  const unassigned = flights.filter(flight => !weekdays.some(([key]) => flight.days?.[key]));
  const stale = schedule && (schedule.stale || !Number.isFinite(Date.parse(schedule.crawledAt)) || Date.now() - Date.parse(schedule.crawledAt) > 86400000);

  return <div className="operations-report flight-report p-3 md:p-6 min-w-0">
    <div className="flex flex-wrap justify-between gap-3 mb-4">
      <h1 className="text-2xl font-bold">항공편 스케줄 조회</h1>
      <button type="button" className="rounded border px-3 py-2 text-sm disabled:opacity-50" disabled={!departure || loading} onClick={() => setRevision(v => v + 1)}>새로고침</button>
    </div>
    <p className="text-sm text-gray-500 mb-4">출발·도착 공항을 선택하면 항공사별 요일 시간표를 확인할 수 있습니다. 시간은 각 공항 현지 시각입니다.</p>
    <p className="entrip-print-only operations-print-scope">출발 공항 · {departure ? airportLabel(departure) : '미선택'} / 도착 공항 · {arrival ? airportLabel(arrival) : '미선택'}</p>
    <div className="entrip-no-print grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <label className="text-sm font-medium">출발 공항
        <select aria-label="출발 공항" className={selectClassName} value={departure} onChange={e => { setDeparture(e.target.value); setArrival(''); setSchedule(null); setError(null); setLoading(false); }}>
          <option value="">출발 공항을 선택하세요</option>
          {KOREAN_AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">도착 공항
        <select aria-label="도착 공항" aria-describedby="arrival-airport-help" className={selectClassName} value={arrival} onChange={e => setArrival(e.target.value)} disabled={!departure || !destinations.length}>
          <option value="">{loading ? '불러오는 중…' : '도착 공항을 선택하세요'}</option>
          {destinations.map(code => <option key={code} value={code}>{airportLabel(code)}</option>)}
        </select>
        <span id="arrival-airport-help" className="block mt-2 text-xs font-normal text-gray-500">{!departure ? '출발 공항을 먼저 선택하세요.' : loading ? '선택한 출발 공항의 운항 노선을 확인하고 있습니다.' : !destinations.length ? '운항 노선을 불러온 뒤 선택할 수 있습니다.' : '제공된 운항 노선에서 도착 공항을 선택하세요.'}</span>
      </label>
    </div>
    {error && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}{schedule && ' 아래에는 이전에 불러온 자료가 표시됩니다.'}</p>}
    {loading && <p role="status" className="py-4 text-blue-600">스케줄을 불러오는 중…</p>}
    {schedule && <p className={`mb-4 text-sm ${stale ? 'text-amber-700' : 'text-gray-600'}`}>자료 기준: {Number.isFinite(Date.parse(schedule.crawledAt)) ? new Date(schedule.crawledAt).toLocaleString('ko-KR') : '기준 시각 미제공'} · {schedule.source || '연결된 항공편 서버'}{stale && ' · 오래된 자료입니다. 현재 운항은 항공사에서 확인하세요.'}</p>}
    {arrival && flights.length > 0 && <>
      <h2 className="font-semibold mb-3">{departure} → {arrival} · {flights.length}개 항공편</h2>
      <p id="flight-scroll-help" className="entrip-no-print mb-2 text-xs text-gray-500">좌우로 스크롤해 월~일 시간표를 확인하세요. 항공사 이름은 고정됩니다.</p>
      <div role="region" aria-label="항공사별 주간 운항 시간표" aria-describedby="flight-scroll-help" tabIndex={0} className="entrip-no-print overflow-x-auto rounded border border-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
        <table className="w-full min-w-[850px] text-sm bg-white">
          <thead className="bg-blue-50"><tr><th scope="col" className="sticky left-0 z-20 bg-blue-50 p-3 border-b border-r text-left min-w-[100px]">항공사</th>{weekdays.map(([key, day]) => <th scope="col" key={key} className="p-3 border-b">{day}</th>)}</tr></thead>
          <tbody>{timetables.map(({ airline, days }) => <tr key={airline}>
            <th scope="row" className="sticky left-0 z-10 bg-white p-3 border-b border-r text-left align-top min-w-[100px]">{airline}</th>
            {days.map((rows, i) => <td key={weekdays[i]![0]} className="p-2 border-b align-top"><FlightTimes flights={rows}/></td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="entrip-print-only">
        <table aria-label="항공편 인쇄 시간표" className="operations-data-table flight-print-table">
          <thead><tr><th scope="col">항공사</th>{weekdays.map(([key, day]) => <th key={key} scope="col">{day}</th>)}</tr></thead>
          <tbody>
            {timetables.flatMap(({ airline, days, segments, incompleteDays }) => Array.from({ length: segments }, (_, segment) => {
              const first = segment * flightsPerPrintedCell;
              return <tr key={`${airline}-${segment}`}>
                <th scope="row">
                  {airline}
                  {segments > 1 && <small>{segment + 1} / {segments}</small>}
                </th>
                {days.map((day, i) => {
                  const rows = day.slice(first, first + flightsPerPrintedCell);
                  return <td key={weekdays[i]![0]}>
                    {rows.length ? <FlightTimes flights={rows}/> : day.length ? '—' : incompleteDays ? '요일 미제공' : '운항 없음'}
                  </td>;
                })}
              </tr>;
            }))}
          </tbody>
        </table>
      </div>
      {unassigned.length > 0 && <section className="mt-3 text-sm text-amber-700">
        <h3 className="font-medium">요일표에 배정되지 않은 항공편</h3>
        <ul>{unassigned.map((flight, i) => <li key={`${flight.flightNo}-${i}`}>
          {flight.airline} · {flight.flightNo} · {flight.departureTime} → {flight.arrivalTime || '미제공'} · {flight.days && Object.keys(flight.days).length ? '편성 요일 없음' : '요일 미제공'}
        </li>)}</ul>
      </section>}
    </>}
    {!loading && !error && schedule && !destinations.length && <p className="py-6 text-gray-500">제공된 자료에 운항 노선이 없습니다.</p>}
    {!loading && !error && arrival && !flights.length && <p className="py-6 text-gray-500">선택한 노선의 스케줄이 없습니다.</p>}
  </div>;
}
