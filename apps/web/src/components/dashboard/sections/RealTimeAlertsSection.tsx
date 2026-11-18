'use client';
import { useBookings } from '../../../hooks/useBookings';
import { dateKey, dayDistance, localDateKey, money, bookingCurrency } from '../../../lib/bookingAnalytics';

export function RealTimeAlertsSection() {
  const { bookings, isLoading, isError } = useBookings();
  if (isLoading) return <div className="p-6 bg-white border rounded-lg">업무를 불러오는 중…</div>;
  if (isError) return <p role="alert" className="p-6 text-red-700">업무 현황을 불러오지 못했습니다.</p>;
  const today = localDateKey();
  const confirmations = bookings.filter(b => b.status === 'PENDING' && dayDistance(today, b.startDate) >= 0 && dayDistance(today, b.startDate) <= 7).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const balances = bookings.filter(b => b.status !== 'CANCELLED' && b.depositAmount != null && Number(b.totalPrice) > Number(b.depositAmount));
  return <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
    <h3 className="text-lg font-semibold mb-4">확인할 업무</h3>
    <h4 className="text-sm font-medium mb-2">7일 내 출발 · 확정 대기 ({confirmations.length}건)</h4>
    {!confirmations.length && <p className="text-sm text-gray-500 py-3">확정 대기 중인 출발 예정 예약이 없습니다.</p>}
    {confirmations.slice(0, 5).map(b => <div key={b.id} className="p-3 mb-2 rounded bg-amber-50 text-sm"><p className="font-medium">{b.teamName} · {b.destination}</p><p className="text-amber-800">출발일 {dateKey(b.startDate)}{dateKey(b.startDate) === today && ' · 오늘 출발'}</p></div>)}
    {confirmations.length > 5 && <p className="entrip-print-only dashboard-preview-count">전체 {confirmations.length}건 중 화면에 표시된 5건</p>}
    <h4 className="text-sm font-medium mt-5 mb-2">예약에 기록된 미수 잔액 ({balances.length}건)</h4>
    <p className="text-xs text-gray-500 mb-3">예약의 총액과 입금 기록 차이입니다. 결제 기한이 없어 연체 여부는 판정하지 않습니다.</p>
    {balances.slice(0, 4).map(b => <div key={b.id} className="flex flex-wrap justify-between gap-2 p-3 mb-2 rounded bg-gray-50 text-sm"><span>{b.teamName}</span><span>{money(Math.max(0, Number(b.totalPrice) - Number(b.depositAmount)), bookingCurrency(b))}</span></div>)}
    {balances.length > 4 && <p className="entrip-print-only dashboard-preview-count">전체 {balances.length}건 중 화면에 표시된 4건</p>}
    {!balances.length && <p className="text-sm text-gray-500">기록된 미수 잔액이 없습니다. 입금액 미입력 예약은 제외합니다.</p>}
  </section>;
}
