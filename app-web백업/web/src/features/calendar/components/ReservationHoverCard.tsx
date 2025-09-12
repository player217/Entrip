'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, DollarSign, User } from 'lucide-react';
import type { Reservation } from '../types';

interface ReservationHoverCardProps {
  reservation: Reservation;
  position: { x: number; y: number };
}

export function ReservationHoverCard({ reservation, position }: ReservationHoverCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const content = (
    <div
      className="absolute z-50 w-80 p-4 bg-gray-900 text-white rounded-lg shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* 화살표 */}
      <div
        className="absolute w-3 h-3 bg-gray-900 transform rotate-45"
        style={{
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
        }}
      />

      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold">{reservation.teamName}</h3>
          <p className="text-sm text-gray-300">예약코드: {reservation.code}</p>
        </div>
        <span className={`
          px-2 py-1 rounded text-xs font-medium
          ${reservation.status === '확정' ? 'bg-emerald-600' : ''}
          ${reservation.status === '대기' ? 'bg-amber-600' : ''}
          ${reservation.status === '취소' ? 'bg-rose-600' : ''}
        `}>
          {reservation.status}
        </span>
      </div>

      {/* 정보 */}
      <div className="grid gap-x-4 gap-y-1 text-[13px] leading-5 font-medium tracking-normal">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] leading-5 font-medium tracking-normal">인원: {reservation.people}명</span>
        </div>
        
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] leading-5 font-medium tracking-normal">
            매출: {new Intl.NumberFormat('ko-KR', { 
              style: 'currency', 
              currency: 'KRW' 
            }).format(reservation.amount)}
          </span>
        </div>

        {reservation.profit && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-[13px] leading-5 font-medium tracking-normal">
              수익: {new Intl.NumberFormat('ko-KR', { 
                style: 'currency', 
                currency: 'KRW' 
              }).format(reservation.profit)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="text-[13px] leading-5 font-medium tracking-normal">담당: {reservation.manager}</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}