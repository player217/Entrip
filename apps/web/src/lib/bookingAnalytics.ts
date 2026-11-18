import type { Booking } from '@entrip/shared';

// Travel dates are calendar dates, even when the API serializes UTC midnight.
export const dateKey = (value: string): string => /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
export const localDateKey = (date = new Date()): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dayDistance = (from: string, to: string): number => Math.round((Date.parse(`${dateKey(to)}T00:00:00Z`) - Date.parse(`${dateKey(from)}T00:00:00Z`)) / 86400000);
export const bookingCurrency = (booking: Booking): string => booking.currency || 'KRW';
export const isActiveBooking = (booking: Booking): boolean => booking.status !== 'CANCELLED';
export const isKrwBooking = (booking: Booking): boolean => isActiveBooking(booking) && bookingCurrency(booking) === 'KRW';
export const money = (value: number, currency = 'KRW'): string => `${Number(value).toLocaleString('ko-KR')} ${currency === 'KRW' ? '원' : currency}`;
const typeLabels: Record<string, string> = { PACKAGE: '패키지', FIT: '자유여행', GROUP: '단체', BUSINESS: '출장', INCENTIVE: '인센티브', GOLF: '골프', HONEYMOON: '허니문', AIRTEL: '에어텔', WORKSHOP: '워크숍', REWARD: '포상', TEAMBUILDING: '팀빌딩' };

export function buildDashboardStats(bookings: Booking[], now = new Date()) {
  const today = localDateKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const active = bookings.filter(isActiveBooking);
  const monthlyRevenue = Array.from({ length: 4 }, (_, index) => {
    // Anchor to day one: subtracting months from the 31st can skip February.
    const month = new Date(now.getFullYear(), now.getMonth() - 3 + index, 1);
    const key = localDateKey(month).slice(0, 7);
    return { name: `${month.getFullYear()}.${String(month.getMonth() + 1).padStart(2, '0')}`, value: active.filter(b => isKrwBooking(b) && dateKey(b.startDate).startsWith(key)).reduce((sum, b) => sum + Number(b.totalPrice || 0), 0) };
  });
  const byType = new Map<string, number>();
  active.forEach(b => { const label = typeLabels[String(b.bookingType)] || '미분류'; byType.set(label, (byType.get(label) || 0) + 1); });
  return {
    todayBookings: active.filter(b => dateKey(b.startDate) === today).length,
    yesterdayBookings: active.filter(b => dateKey(b.startDate) === localDateKey(yesterday)).length,
    confirmedBookings: active.filter(b => b.status === 'CONFIRMED').length,
    pendingBookings: active.filter(b => b.status === 'PENDING').length,
    monthlyRevenue,
    typeStats: Array.from(byType, ([name, value]) => ({ name, value })),
    excludedCurrencyCount: active.filter(b => bookingCurrency(b) !== 'KRW').length,
  };
}

export function aggregateOperations(bookings: Booking[], period: 'month' | 'quarter' | 'year') {
  const active = bookings.filter(isActiveBooking);
  const groups = new Map<string, { label: string; count: number; pax: number; revenue: number; profit: number; knownCostCount: number; pricedCount: number }>();
  const managers = new Map<string, { name: string; count: number; pax: number; revenue: number; profit: number; knownCostCount: number; pricedCount: number }>();
  for (const booking of active) {
    const key = dateKey(booking.startDate);
    if (!key) continue;
    const label = period === 'year' ? key.slice(0, 4) : period === 'quarter' ? `${key.slice(0, 4)} ${Math.ceil(Number(key.slice(5, 7)) / 3)}분기` : key.slice(0, 7);
    const name = booking.managerName || booking.coordinator || booking.user?.name || '담당자 미지정';
    const group = groups.get(label) || { label, count: 0, pax: 0, revenue: 0, profit: 0, knownCostCount: 0, pricedCount: 0 };
    const manager = managers.get(name) || { name, count: 0, pax: 0, revenue: 0, profit: 0, knownCostCount: 0, pricedCount: 0 };
    for (const item of [group, manager]) {
      item.count += 1;
      item.pax += Number(booking.paxCount || 0);
      if (isKrwBooking(booking)) {
        item.pricedCount += 1;
        item.revenue += Number(booking.totalPrice || 0);
        if (booking.costPrice != null && Number.isFinite(Number(booking.costPrice))) {
          item.knownCostCount += 1;
          item.profit += Number(booking.totalPrice || 0) - Number(booking.costPrice);
        }
      }
    }
    groups.set(label, group); managers.set(name, manager);
  }
  return { periods: [...groups.values()].sort((a, b) => a.label.localeCompare(b.label)), managers: [...managers.values()].sort((a, b) => b.revenue - a.revenue), excludedCurrencyCount: active.filter(b => !isKrwBooking(b)).length };
}
