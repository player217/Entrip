import type { Booking } from '@entrip/shared';
import { aggregateOperations, buildDashboardStats, dateKey, dayDistance } from '../src/lib/bookingAnalytics';

function booking(overrides: Partial<Booking> = {}): Booking {
  return { id: 'b1', bookingNumber: 'B001', customerName: '고객', teamName: '팀', destination: '일본', startDate: '2026-03-31T00:00:00.000Z', endDate: '2026-04-02T00:00:00.000Z', paxCount: 5, status: 'CONFIRMED', totalPrice: 100000, currency: 'KRW', createdAt: '2026-03-20T00:00:00.000Z', updatedAt: '2026-03-20T00:00:00.000Z', companyCode: 'test', ...overrides } as Booking;
}

describe('actual booking analytics', () => {
  it('normalizes date-only and serialized midnight to the same travel day', () => {
    expect(dateKey('2026-03-31T00:00:00.000Z')).toBe('2026-03-31');
    expect(dayDistance('2026-03-31T00:00:00Z', '2026-04-02')).toBe(2);
  });

  it('counts today departures including ISO dates and excludes cancelled bookings', () => {
    const result = buildDashboardStats([booking(), booking({ id: 'cancel', status: 'CANCELLED' as Booking['status'] }), booking({ id: 'yesterday', startDate: '2026-03-30' })], new Date(2026, 2, 31, 12));
    expect(result.todayBookings).toBe(1);
    expect(result.yesterdayBookings).toBe(1);
  });

  it('anchors month arithmetic on day one and never skips February from the 31st', () => {
    const result = buildDashboardStats([booking({ startDate: '2026-02-28', totalPrice: 90 }), booking({ startDate: '2026-03-31', totalPrice: 10 })], new Date(2026, 2, 31));
    expect(result.monthlyRevenue.map(m => m.name)).toEqual(['2025.12', '2026.01', '2026.02', '2026.03']);
    expect(result.monthlyRevenue.map(m => m.value)).toEqual([0, 0, 90, 10]);
  });

  it('does not add USD to KRW totals or infer travel type from a destination', () => {
    const result = buildDashboardStats([booking(), booking({ id: 'usd', currency: 'USD', totalPrice: 500 })], new Date(2026, 2, 31));
    expect(result.monthlyRevenue[3]!.value).toBe(100000);
    expect(result.excludedCurrencyCount).toBe(1);
    expect(result.typeStats).toEqual([{ name: '미분류', value: 2 }]);
  });

  it('counts only recorded costs for profit and does not treat absent costs as zero', () => {
    const result = aggregateOperations([booking({ costPrice: 70000, managerName: '담당 A' }), booking({ id: 'unknown', managerName: '담당 A' }), booking({ id: 'usd', currency: 'USD', costPrice: 5, totalPrice: 10 })], 'month');
    expect(result.periods[0]).toMatchObject({ count: 3, revenue: 200000, profit: 30000, pricedCount: 2, knownCostCount: 1 });
    expect(result.managers[0]).toMatchObject({ name: '담당 A', count: 2, knownCostCount: 1 });
  });

  it('groups cross-year quarters separately and honours a genuine zero cost', () => {
    const result = aggregateOperations([booking({ startDate: '2025-01-01', costPrice: 0 }), booking({ id: 'next', startDate: '2026-03-31' })], 'quarter');
    expect(result.periods.map(p => p.label)).toEqual(['2025 1분기', '2026 1분기']);
    expect(result.periods[0]!.profit).toBe(100000);
    expect(result.periods[0]!.knownCostCount).toBe(1);
  });
});
