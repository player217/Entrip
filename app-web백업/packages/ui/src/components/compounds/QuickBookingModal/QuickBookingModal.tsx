'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookingForm } from './BookingForm';
import { cn } from '../../../utils';
import { useFocusTrap } from './useFocusTrap';
import type { QuickBookingModalProps } from './types';

export function QuickBookingModal({
  isOpen,
  onClose,
  onSubmit,
  selectedDate
}: QuickBookingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap(isOpen);
  // ESC 키로 닫기 및 body overflow 관리
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    // 기존 overflow 값 저장
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      
      // 스크롤바 너비 계산
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // body overflow hidden 및 padding 보정
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      // 원래 값으로 복원
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, onClose]);

  // 모달 외부 클릭으로 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      ref={focusTrapRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* 모달 - 최신 스타일 + 반응형 */}
      <div
        ref={modalRef}
        className={cn(
          // 반응형 너비 설정
          "w-full",
          "max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl",
          // 반응형 높이 설정
          "h-full sm:h-auto sm:max-h-[85vh] md:max-h-[90vh]",
          // 기본 스타일
          "bg-[#FBF9F5] rounded-none sm:rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "animate-slide-in",
          // 반응형 마진
          "mx-0 sm:mx-4 md:mx-6 lg:mx-8",
          "bg-opacity-100"
        )}
        style={{ backgroundColor: '#FBF9F5' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 폼 영역 */}
        <BookingForm
          onSubmit={onSubmit}
          onCancel={onClose}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  );

  // Portal로 렌더링
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}

// Re-export types
export type { QuickBookingModalProps, QuickBookingFormData } from './types';