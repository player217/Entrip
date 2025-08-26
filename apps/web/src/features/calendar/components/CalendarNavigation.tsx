'use client';

import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@entrip/ui';
import type { CalendarNavigationProps } from '../types';

export function CalendarNavigation({ date, onPrev, onToday, onNext }: CalendarNavigationProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {format(date, 'yyyy년 M월', { locale: ko })}
      </h2>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onPrev}
          className="p-2"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onToday}
          className="flex items-center gap-1 px-3"
        >
          <Calendar className="w-4 h-4" />
          오늘
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onNext}
          className="p-2"
          aria-label="다음 달"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}