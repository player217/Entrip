'use client';

import React from 'react';
import { MonthlySummary } from '@entrip/shared';
// import { Icon } from '../primitives/Icon'; // TODO: Use for summary icons

interface MonthlySummaryFooterProps {
  summary: MonthlySummary;
}

export const MonthlySummaryFooter: React.FC<MonthlySummaryFooterProps> = ({ summary }) => {
  /* const formatCurrency = (value: number) => { // TODO: Use for currency formatting
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  }; */

  return (
    <footer className="stats-bar flex justify-between px-6 h-10 items-center bg-gray-50 border-t border-border text-slate-600 text-[13px]">
      <span>팀 수: <b className="text-gray-900">{summary.teamCount}</b></span>
      <span>인원: <b className="text-gray-900">{summary.paxCount.toLocaleString()}</b>명</span>
      <span>매출: <b className="text-brand-500">{summary.revenue.toLocaleString()}</b></span>
      <span>실수익: <b className="text-emerald-600">{summary.profit.toLocaleString()}</b></span>
    </footer>
  );
};
