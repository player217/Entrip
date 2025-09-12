'use client';

import React from 'react';
import { Users, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import type { SummaryFooterProps, MonthlyStats } from '../types';

export function SummaryFooter({ reservations }: SummaryFooterProps) {
  // 월간 통계 계산
  const stats: MonthlyStats = reservations.reduce(
    (acc, reservation) => {
      if (reservation.status !== '취소') {
        acc.team += 1;
        acc.people += reservation.people;
        acc.revenue += reservation.amount;
        acc.profit += reservation.profit || 0;
      }
      return acc;
    },
    { team: 0, people: 0, revenue: 0, profit: 0 }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const profitRate = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

  return (
    <footer className="bg-gray-50 border-t border-gray-200 rounded-b-lg">
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">월간 요약</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 팀 수 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">총 팀</p>
              <p className="text-lg font-semibold text-gray-900">{stats.team}팀</p>
            </div>
          </div>

          {/* 인원 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">총 인원</p>
              <p className="text-lg font-semibold text-gray-900">{stats.people.toLocaleString()}명</p>
            </div>
          </div>

          {/* 매출 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">총 매출</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.revenue)}</p>
            </div>
          </div>

          {/* 수익 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">순수익 ({profitRate.toFixed(1)}%)</p>
              <p className="text-lg font-semibold text-emerald-600">{formatCurrency(stats.profit)}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}