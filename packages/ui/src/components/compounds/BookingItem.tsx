'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BookingEntry } from '@entrip/shared';
// import { Icon } from '../primitives/Icon'; // TODO: Use for status icons

const statusColors: Record<BookingEntry['status'], string> = {
  PENDING: '#FEF3C7',    // 연한 노란색
  CONFIRMED: '#D1FAE5',  // 연한 초록색
  CANCELLED: '#FEE2E2'   // 연한 빨간색
};

const statusTextColors: Record<BookingEntry['status'], string> = {
  PENDING: '#92400E',    // 진한 노란색
  CONFIRMED: '#065F46',  // 진한 초록색
  CANCELLED: '#991B1B'   // 진한 빨간색
};

interface BookingItemProps {
  booking: BookingEntry;
  variant?: 'compact' | 'detailed';
  showTime?: boolean;
  className?: string;
}

export const BookingItem: React.FC<BookingItemProps> = ({ booking, variant = 'compact', showTime = false, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    // 숨김 타이머가 있으면 취소
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    
    // 툴팁 위치 결정
    if (spaceRight > 200) {
      setTooltipPosition('right');
    } else if (spaceLeft > 200) {
      setTooltipPosition('left');
    } else {
      setTooltipPosition('top');
    }
    setShowTooltip(true);
  };
  
  const handleMouseLeave = () => {
    // 200ms 지연 후 숨김
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200);
  };
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Detailed variant 렌더링
  if (variant === 'detailed') {
    return (
      <div 
        className={`p-2 rounded-lg shadow-sm border transition-all duration-150 hover:shadow-md cursor-pointer ${className}`}
        style={{ 
          backgroundColor: statusColors[booking.status],
          borderColor: statusTextColors[booking.status] + '40',
        }}
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-sm" style={{ color: statusTextColors[booking.status] }}>
              {booking.name || booking.title}
            </h4>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" 
              style={{ 
                backgroundColor: statusTextColors[booking.status] + '20',
                color: statusTextColors[booking.status]
              }}>
              {booking.typeCode || booking.type}
            </span>
          </div>
          
          {(showTime || booking.departureTime) && (
            <div className="flex items-center gap-1 text-xs" style={{ color: statusTextColors[booking.status] + 'CC' }}>
              <span className="font-medium">{booking.departureTime || '미정'}</span>
              {booking.arrivalTime && <span>- {booking.arrivalTime}</span>}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs" style={{ color: statusTextColors[booking.status] + 'CC' }}>
            <div className="flex items-center gap-2">
              {booking.paxCount && <span>{booking.paxCount}명</span>}
              {booking.manager && <span>{booking.manager}</span>}
            </div>
            <span className="font-medium">
              {booking.status === 'PENDING' ? '대기' : 
               booking.status === 'CONFIRMED' ? '확정' : '취소'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant 렌더링 (기존 코드)
  return (
    <div className="relative">
      <li 
        className={`event-item px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-all duration-150 hover:shadow-sm event-${booking.status} flex items-center gap-1`}
        style={{ 
          backgroundColor: statusColors[booking.status],
          color: statusTextColors[booking.status],
          borderLeft: `3px solid ${statusTextColors[booking.status]}`
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="font-semibold bg-white/30 px-1 rounded flex-shrink-0">
          {booking.typeCode || booking.type}
        </span>
        <span className="truncate">
          {booking.destination || booking.name || booking.title}
        </span>
        <span className="ml-auto flex-shrink-0">
          {booking.status === 'CONFIRMED' ? '✓' : 
           booking.status === 'PENDING' ? '⏳' : '✗'}
        </span>
      </li>
      
      {/* Enhanced Tooltip */}
      {showTooltip && (
        <div 
          className={`event-tooltip absolute z-50 w-56 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl pointer-events-none ${
            tooltipPosition === 'right' ? 'left-full ml-2 top-0' :
            tooltipPosition === 'left' ? 'right-full mr-2 top-0' :
            tooltipPosition === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
            'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
          style={{ pointerEvents: 'none' }}>
          <div className="space-y-2">
            {/* 헤더 - 고객명과 목적지 */}
            <div className="border-b border-gray-700 pb-2">
              <p className="text-sm font-bold text-white">
                {booking.customerName || booking.name || booking.title}
              </p>
              {booking.destination && (
                <p className="text-xs text-gray-300 mt-0.5">
                  {booking.destination}
                </p>
              )}
            </div>
            
            {/* 상세 정보 */}
            <div className="space-y-1.5 text-xs">
              {/* 팀 타입 */}
              {booking.typeCode && (
                <div className="flex justify-between">
                  <span className="text-gray-400">팀타입:</span>
                  <span className="text-white">
                    {booking.typeCode === 'GF' ? '골프' :
                     booking.typeCode === 'IN' ? '인센티브' :
                     booking.typeCode === 'HM' ? '허니문' : '에어텔'}
                  </span>
                </div>
              )}
              
              {/* 인원 */}
              {booking.paxCount && (
                <div className="flex justify-between">
                  <span className="text-gray-400">인원:</span>
                  <span className="text-white">{booking.paxCount}명</span>
                </div>
              )}
              
              {/* 일정 */}
              {booking.departureDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">출발:</span>
                  <span className="text-white">
                    {new Date(booking.departureDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              
              {booking.returnDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">귀국:</span>
                  <span className="text-white">
                    {new Date(booking.returnDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              
              {/* 담당자 */}
              {booking.manager && (
                <div className="flex justify-between">
                  <span className="text-gray-400">담당자:</span>
                  <span className="text-white">{booking.manager}</span>
                </div>
              )}
              
              {/* 매출 */}
              {booking.totalPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-400">매출:</span>
                  <span className="text-white font-medium">
                    {booking.totalPrice.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>
            
            {/* 푸터 - 상태 */}
            <div className="border-t border-gray-700 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">상태:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  booking.status === 'CONFIRMED' ? 'bg-green-600 text-white' :
                  booking.status === 'PENDING' ? 'bg-yellow-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {booking.status === 'PENDING' ? '대기중' : 
                   booking.status === 'CONFIRMED' ? '확정' : '취소'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Tooltip arrow */}
          <div className={`event-tooltip-arrow absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            tooltipPosition === 'right' ? '-left-1 top-3' :
            tooltipPosition === 'left' ? '-right-1 top-3' :
            tooltipPosition === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' :
            '-top-1 left-1/2 -translate-x-1/2'
          }`}></div>
        </div>
      )}
    </div>
  );
};
