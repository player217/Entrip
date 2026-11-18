'use client';
import { useMemo, useState } from 'react';
import { ChartCard } from '@entrip/ui';
import { useBookings } from '../../../src/hooks/useBookings';
import { aggregateOperations, money } from '../../../src/lib/bookingAnalytics';

export default function StatsPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { bookings, isLoading, isError, mutate } = useBookings();
  const data = useMemo(() => aggregateOperations(bookings, period), [bookings, period]);
  const totalCount = data.periods.reduce((sum, p) => sum + p.count, 0);
  const totalPax = data.periods.reduce((sum, p) => sum + p.pax, 0);
  const revenue = data.periods.reduce((sum, p) => sum + p.revenue, 0);
  const profit = data.periods.reduce((sum, p) => sum + p.profit, 0);
  const knownCosts = data.periods.reduce((sum, p) => sum + p.knownCostCount, 0);
  const pricedCount = data.periods.reduce((sum, p) => sum + p.pricedCount, 0);
  const managerCounts = [...data.managers].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko-KR'));
  return <div className="operations-report stats-report p-3 md:p-6 space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-semibold">운영 현황</h1><button className="border rounded px-3 py-2 text-sm" disabled={isLoading} onClick={() => void mutate()}>새로고침</button></div>
    <p className="text-sm text-gray-500">현재 회사의 전체 예약을 출발일 기준으로 집계합니다. 취소는 제외하며 금액은 KRW만 합산합니다. 외화 {data.excludedCurrencyCount}건은 금액 합계에서 제외합니다.</p>
    {isLoading ? <p role="status">예약 자료를 불러오는 중…</p> : isError ? <p role="alert" className="text-red-700">운영 자료를 불러오지 못했습니다. 새로고침으로 다시 시도하세요.</p> : <>
      <div className="operations-kpis grid grid-cols-2 lg:grid-cols-4 gap-4">{[['예약', `${totalCount}건`], ['인원', `${totalPax}명`], ['예약 금액 (KRW)', money(revenue)], ['수익 (원가 입력 예약)', knownCosts ? money(profit) : '원가 미입력']].map(([label, value], index) => <div key={label} className={`min-w-0 bg-white border rounded-lg p-4 ${index >= 2 ? 'col-span-2 sm:col-span-1' : ''}`}><p className="text-sm text-gray-500">{label}</p><p className="text-lg xl:text-xl font-semibold tabular-nums whitespace-nowrap mt-2">{value}</p></div>)}</div>
      <p className="text-xs text-gray-500">수익은 원가가 입력된 원화 예약 {knownCosts}/{pricedCount}건만 계산합니다. 원가 미입력은 수익 0원으로 간주하지 않습니다.</p>
      <p className="entrip-print-only operations-print-scope">집계 기간 · {{ month: '월별', quarter: '분기별', year: '연도별' }[period]} / 출발일 기준</p>
      <div className="entrip-no-print flex gap-2" role="group" aria-label="집계 기간">{([['month', '월별'], ['quarter', '분기별'], ['year', '연도별']] as const).map(([value, label]) => <button key={value} aria-pressed={period === value} className={`px-4 py-2 rounded text-sm ${period === value ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setPeriod(value)}>{label}</button>)}</div>
      {!totalCount && <p className="text-gray-500 py-6">집계할 예약이 없습니다.</p>}
      <div className="operations-charts grid lg:grid-cols-2 gap-6">
        <ChartCard title="기간별 예약 금액 (KRW)" data={data.periods.map(p => ({ name: p.label, value: p.revenue }))} valueLabel="예약 금액" valueFormatter={money} height={300}/>
        <ChartCard title="담당자별 예약 건수" data={managerCounts.map(m => ({ name: m.name, value: m.count }))} valueLabel="예약 건수" valueFormatter={(value: number) => `${value.toLocaleString('ko-KR')}건`} integerValues orientation="horizontal" height={Math.max(300, managerCounts.length * 36 + 40)} maxHeight={340}/>
      </div>
      <section aria-label="담당자별 전체 집계">
        <h2 className="entrip-print-only">담당자별 전체 집계 · {data.managers.length}명</h2>
        <p id="stats-scroll-help" className="entrip-no-print mb-2 text-xs text-gray-500">전체 담당자 {data.managers.length}명 · 좌우로 스크롤해 금액과 원가 입력 비율을 확인하세요.</p>
        <div role="region" aria-label="담당자별 집계 표" aria-describedby="stats-scroll-help" tabIndex={0} className="overflow-x-auto rounded border bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
          <table className="operations-data-table min-w-[650px] w-full text-sm"><thead className="bg-blue-50"><tr>{['담당자', '건수', '인원', '예약 금액 (KRW)', '수익 / 원가 입력 비율'].map((h, index) => <th scope="col" key={h} className={`p-3 text-left ${index === 0 ? 'sticky left-0 z-20 bg-blue-50 border-r' : ''}`}>{h}</th>)}</tr></thead><tbody>{data.managers.map(m => <tr key={m.name} className="border-t"><th scope="row" className="sticky left-0 z-10 bg-white border-r p-3 text-left font-normal">{m.name}</th><td className="p-3">{m.count}</td><td className="p-3">{m.pax}</td><td className="p-3 whitespace-nowrap tabular-nums">{money(m.revenue)}</td><td className="p-3 whitespace-nowrap">{m.knownCostCount ? money(m.profit) : '미입력'} <span className="text-gray-500">({m.knownCostCount}/{m.pricedCount}건)</span></td></tr>)}</tbody></table>
        </div>
      </section>
    </>}
  </div>;
}
