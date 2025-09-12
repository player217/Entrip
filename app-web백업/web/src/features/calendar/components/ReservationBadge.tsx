'use client';

import React, { useState } from 'react';
import { ReservationHoverCard } from './ReservationHoverCard';
import type { ReservationBadgeProps } from '../types';

const statusColors = {
  '확정': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '대기': 'bg-amber-100 text-amber-800 border-amber-200',
  '취소': 'bg-rose-100 text-rose-800 border-rose-200',
} as const;

const typeAbbreviations: Record<string, string> = {
  'IN': '인바운드',
  'OUT': '아웃바운드',
  'GF': '골프',
  'AT': '에어텔',
  'PKG': '패키지',
};

export function ReservationBadge({ reservation }: ReservationBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const statusColor = statusColors[reservation.status] || statusColors['대기'];
  const typeLabel = typeAbbreviations[reservation.type] || reservation.type;

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          relative flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
          border cursor-pointer transition-all hover:shadow-sm
          ${statusColor}
        `}
      >
        <span className="font-semibold">{typeLabel}</span>
        <span className="truncate">{reservation.teamName}</span>
      </div>

      {isHovered && (
        <ReservationHoverCard 
          reservation={reservation} 
          position={mousePosition}
        />
      )}
    </>
  );
}